import type { Order, OrderItem, Product } from '../src/types';
import type { OfferBundle } from '../src/data/offers';
import { hash, HttpError, json, rateLimit, readJson, text } from './types';
import type { Env } from './types';
import { deliverTelegram } from './telegram';

type Stored = { id: string; data: string; request_hash: string };
export async function placeOrder(request: Request, env: Env, ctx: ExecutionContext) {
  const data = await readJson(request, 20000);
  const name = text(data.customer_name, 'Ім’я', 100, 2);
  const phone = text(data.customer_phone, 'Телефон', 22, 9);
  if (!/^\+?[0-9\s()\-]{9,22}$/.test(phone) || phone.replace(/\D/g, '').length < 9) throw new HttpError(400, 'Перевірте номер телефону');
  const city = text(data.city, 'Місто', 120, 2);
  const comment = text(data.comment ?? '', 'Коментар', 500);
  const deliveryAddress = text(data.delivery_address ?? '', 'Відділення / адреса Нової пошти', 250);
  const source = text(data.source ?? 'direct', 'Джерело переходу', 200) || 'direct';
  const medium = text(data.utm_medium ?? '', 'UTM medium', 200);
  const campaign = text(data.utm_campaign ?? '', 'UTM campaign', 200);
  // These edge headers are supplied by Cloudflare; never accept an IP from form data or X-Forwarded-For.
  const edgeIp = request.headers.get('CF-Connecting-IPv6') || request.headers.get('CF-Connecting-IP') || '';
  const customerIp = /^[0-9a-fA-F:.]{3,45}$/.test(edgeIp) ? edgeIp : '';

  const idempotency = request.headers.get('Idempotency-Key') ?? '';
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(idempotency)) throw new HttpError(400, 'Некоректний ключ замовлення');
  if (!Array.isArray(data.items) || !data.items.length || data.items.length > 30) throw new HttpError(400, 'Некоректний кошик');
  const seen = new Set<string>();
  const cart = data.items.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new HttpError(400, 'Некоректний товар');
    const value = item as Record<string, unknown>;
    const productId = text(value.productId, 'Товар', 110, 1);
    if (seen.has(productId) || !Number.isInteger(value.quantity) || Number(value.quantity) < 1 || Number(value.quantity) > 50) throw new HttpError(400, 'Перевірте кількість товарів');
    seen.add(productId);
    return { productId, quantity: value.quantity as number };
  }).sort((a, b) => a.productId.localeCompare(b.productId));
  const requestHash = await hash(JSON.stringify({ name, phone, city, comment, deliveryAddress, cart }));
  const existing = await env.DB.prepare('SELECT id,request_hash FROM orders WHERE idempotency_key=?').bind(idempotency).first<Stored>();
  if (existing) {
    if (existing.request_hash !== requestHash) throw new HttpError(409, 'Цей ключ вже використано для іншого замовлення');
    return json({ id: existing.id });
  }
  await rateLimit(env, request, 'order', 10, 600);
  const [productRows, offerRows] = await env.DB.batch<{ data: string }>([
    env.DB.prepare('SELECT data FROM products WHERE active=1'),
    env.DB.prepare('SELECT data FROM offers WHERE active=1'),
  ]);
  const catalog = new Map<string, { name: string; weight: string; price: number }>();
  for (const row of productRows.results) { const p = JSON.parse(row.data) as Product; catalog.set(p.id, p); }
  for (const row of offerRows.results) { const offer = JSON.parse(row.data) as OfferBundle; catalog.set(`offer:${offer.id}`, { name: offer.title, weight: offer.weight, price: offer.price }); }
  let totalCents = 0;
  const items: OrderItem[] = cart.map(item => {
    const product = catalog.get(item.productId);
    if (!product) throw new HttpError(409, 'Товар більше недоступний. Оновіть каталог.');
    totalCents += Math.round(product.price * 100) * item.quantity;
    return { product_id: item.productId, name: product.name, weight: product.weight, price: product.price, quantity: item.quantity };
  });
  const order: Order = { id: crypto.randomUUID(), customer_name: name, customer_phone: phone, city, comment, delivery_address: deliveryAddress, customer_ip: customerIp, source, ...(medium ? { utm_medium: medium } : {}), ...(campaign ? { utm_campaign: campaign } : {}), items, total: totalCents / 100, status: 'new', created_at: new Date().toISOString() };
  // The order and notification are committed together. Retried HTTP requests create no second order.
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO orders(id,idempotency_key,request_hash,data,status,created_at) VALUES (?,?,?,?,'new',?) ON CONFLICT(idempotency_key) DO NOTHING`)
      .bind(order.id, idempotency, requestHash, JSON.stringify(order), order.created_at),
    env.DB.prepare(`INSERT OR IGNORE INTO telegram_outbox(order_id) SELECT id FROM orders WHERE idempotency_key=?`).bind(idempotency),
  ]);
  const saved = await env.DB.prepare('SELECT id,request_hash FROM orders WHERE idempotency_key=?').bind(idempotency).first<Stored>();
  if (!saved) throw new HttpError(503, 'Не вдалося зберегти замовлення');
  if (saved.request_hash !== requestHash) throw new HttpError(409, 'Цей ключ вже використано для іншого замовлення');
  ctx.waitUntil(deliverTelegram(env, saved.id));
  return json({ id: saved.id }, 201);
}
