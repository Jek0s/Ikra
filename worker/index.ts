import { configured, isAdmin, login, logout } from './auth';
import { placeOrder } from './orders';
import { deliverTelegram, retryTelegram } from './telegram';
import { HttpError, json, rateLimit, readJson, text } from './types';
import type { Env } from './types';
import { image, offer, product, section } from './validation';

async function upload(request: Request, env: Env) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) throw new HttpError(503, 'Завантаження фото ще не підключено. Наразі можна вказати посилання на фото.');
  if (Number(request.headers.get('Content-Length') ?? 0) > 5 * 1024 * 1024 + 10000) throw new HttpError(413, 'Фото має бути до 5 МБ');
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) throw new HttpError(415, 'Очікується файл зображення');
  let body: FormData;
  try { body = await request.formData(); } catch { throw new HttpError(400, 'Не вдалося прочитати файл'); }
  const file = body.get('file');
  if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new HttpError(400, 'Оберіть JPG, PNG або WEBP до 5 МБ');
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const actual = header[0] === 0xff && header[1] === 0xd8 ? 'image/jpeg' : header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47 ? 'image/png' : new TextDecoder().decode(header.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(header.slice(8, 12)) === 'WEBP' ? 'image/webp' : '';
  if (actual !== file.type) throw new HttpError(400, 'Формат файлу не відповідає зображенню');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signatureBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`folder=ikra-deluxe&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`));
  const signature = [...new Uint8Array(signatureBytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const form = new FormData();
  form.set('file', file); form.set('folder', 'ikra-deluxe'); form.set('timestamp', timestamp); form.set('api_key', env.CLOUDINARY_API_KEY); form.set('signature', signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(env.CLOUDINARY_CLOUD_NAME)}/image/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(20000) });
  const result = await response.json() as { secure_url?: string };
  if (!response.ok || !result.secure_url) throw new HttpError(502, 'Не вдалося завантажити фото');
  return json({ url: image(result.secure_url) });
}

async function handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
  if (!env.DB) throw new HttpError(503, 'Базу ще не підключено');
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) throw new HttpError(405, 'Метод не підтримується');
  if (request.method !== 'GET') {
    const origin = request.headers.get('Origin');
    if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') throw new HttpError(403, 'Запит з іншого сайту заборонено');
  }
  if (path === '/api/auth/login' && request.method === 'POST') return login(request, env);
  if (path === '/api/auth/logout' && request.method === 'POST') return logout(request);
  const admin = await isAdmin(request, env);
  if (path === '/api/auth/session' && request.method === 'GET') return json({ authorized: admin, configured: configured(env) });
  if (path === '/api/catalog' && request.method === 'GET') {
    const [products, offers] = await env.DB.batch<{ data: string }>([
      env.DB.prepare(`SELECT data FROM products ${admin ? '' : 'WHERE active=1'} ORDER BY sort_order,id`),
      env.DB.prepare(`SELECT data FROM offers ${admin ? '' : 'WHERE active=1'} ORDER BY sort_order,id`),
    ]);
    return json({ products: products.results.map(row => JSON.parse(row.data)), offers: offers.results.map(row => JSON.parse(row.data)) });
  }
  if (path === '/api/content' && request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT id,data FROM site_sections').all<{ id: string; data: string }>();
    return json(Object.fromEntries(results.map(row => [row.id, JSON.parse(row.data)])));
  }
  if (path === '/api/orders' && request.method === 'POST') return placeOrder(request, env, ctx);
  if (!path.startsWith('/api/admin/')) throw new HttpError(404, 'Не знайдено');
  if (!admin) throw new HttpError(401, 'Увійдіть до адмінки');
  if (path === '/api/admin/status' && request.method === 'GET') {
    const pending = await env.DB.prepare('SELECT COUNT(*) AS count FROM telegram_outbox WHERE sent_at IS NULL').first<{ count: number }>();
    const totals = await env.DB.prepare("SELECT COUNT(*) AS count,COALESCE(SUM(CASE WHEN status!='cancelled' THEN json_extract(data,'$.total') ELSE 0 END),0) AS total FROM orders").first<{ count: number; total: number }>();
    return json({ orderCount: totals?.count ?? 0, orderTotal: totals?.total ?? 0, telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID), images: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET), pendingNotifications: pending?.count ?? 0 });
  }
  if (path === '/api/admin/orders' && request.method === 'GET') {
    // Bounded pages keep order history below the Worker memory limit as it grows.
    const page = Math.max(0, Number.parseInt(url.searchParams.get('page') ?? '0') || 0);
    const { results } = await env.DB.prepare(`SELECT o.data,o.status,t.sent_at,t.attempts,t.last_error FROM orders o
      LEFT JOIN telegram_outbox t ON t.order_id=o.id ORDER BY o.created_at DESC LIMIT 100 OFFSET ?`).bind(page * 100)
      .all<{ data: string; status: string; sent_at: number | null; attempts: number; last_error: string | null }>();
    return json(results.map(row => ({ ...JSON.parse(row.data), status: row.status,
      telegram_status: row.sent_at ? 'sent' : !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID ? 'not_configured' : row.attempts >= 10 ? 'failed' : 'pending',
      telegram_error: row.sent_at ? null : row.last_error })));
  }
  const orderMatch = path.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (orderMatch && request.method === 'PUT') {
    const data = await readJson(request, 1000);
    const status = text(data.status, 'Статус', 20);
    if (!['new', 'processing', 'shipped', 'done', 'cancelled'].includes(status)) throw new HttpError(400, 'Невідомий статус');
    const result = await env.DB.prepare('UPDATE orders SET status=? WHERE id=?').bind(status, orderMatch[1]).run();
    if (!result.meta.changes) throw new HttpError(404, 'Замовлення не знайдено');
    return json({ ok: true });
  }
  const retryMatch = path.match(/^\/api\/admin\/orders\/([^/]+)\/telegram$/);
  if (retryMatch && request.method === 'POST') {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) throw new HttpError(503, 'Telegram ще не підключено');
    await env.DB.prepare('UPDATE telegram_outbox SET attempts=0,next_attempt=0,last_error=NULL WHERE order_id=? AND sent_at IS NULL AND lease_until<=?').bind(retryMatch[1], Date.now()).run();
    await deliverTelegram(env, retryMatch[1]);
    const delivery = await env.DB.prepare('SELECT sent_at,last_error FROM telegram_outbox WHERE order_id=?').bind(retryMatch[1]).first<{ sent_at: number | null; last_error: string | null }>();
    if (!delivery) throw new HttpError(404, 'Сповіщення для замовлення не знайдено');
    if (!delivery.sent_at) throw new HttpError(delivery.last_error ? 502 : 409, delivery.last_error || 'Сповіщення вже надсилається. Оновіть список за кілька секунд.');
    return json({ ok: true });
  }
  const contentMatch = path.match(/^\/api\/admin\/content\/([a-z]+)$/);
  if (contentMatch && request.method === 'PUT') {
    const value = section(contentMatch[1], await readJson(request, 500000));
    await env.DB.prepare(`INSERT INTO site_sections(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=CURRENT_TIMESTAMP`).bind(contentMatch[1], JSON.stringify(value)).run();
    return json({ ok: true });
  }
  if (path === '/api/admin/images' && request.method === 'POST') {
    await rateLimit(env, request, 'upload', 30, 3600);
    return upload(request, env);
  }
  const collectionMatch = path.match(/^\/api\/admin\/(products|offers)(?:\/([a-zA-Z0-9_-]+))?$/);
  if (collectionMatch) {
    const table = collectionMatch[1]; // Strict allowlist above; no user SQL identifiers.
    if (request.method === 'PUT' && !collectionMatch[2]) {
      const data = await readJson(request, 20000);
      const value = table === 'products' ? product(data) : offer(data);
      await env.DB.prepare(`INSERT INTO ${table}(id,data,active,sort_order) VALUES (?,?,?,(SELECT COALESCE(MAX(sort_order),0)+1 FROM ${table}))
        ON CONFLICT(id) DO UPDATE SET data=excluded.data,active=excluded.active`).bind(value.id, JSON.stringify(value), Number(value.active)).run();
      return json({ ok: true });
    }
    if (request.method === 'DELETE' && collectionMatch[2]) {
      await env.DB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(collectionMatch[2]).run();
      return json({ ok: true });
    }
  }
  throw new HttpError(404, 'Не знайдено');
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try { return await handle(request, env, ctx); }
    catch (reason) {
      if (reason instanceof HttpError) return json({ error: reason.message }, reason.status);
      // Avoid exposing D1 statements, configuration or customer data to a public response.
      console.error('Request failed', new URL(request.url).pathname, reason instanceof Error ? reason.name : 'UnknownError');
      return json({ error: 'Не вдалося виконати запит. Спробуйте ще раз.' }, 503);
    }
  },
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) { ctx.waitUntil(retryTelegram(env)); },
} satisfies ExportedHandler<Env>;
