import type { Order } from '../src/types';
import type { Env } from './types';

const oneLine = (value: string) => value.replace(/\s+/g, ' ').trim();

class TelegramError extends Error {
  constructor(message: string, public retryAfter = 0) { super(message); }
}

// Only expose known explanations, never Telegram response bodies or token-bearing URLs.
function telegramError(status: number, description = '', retryAfter = 0): TelegramError {
  if (status === 401 || status === 404) return new TelegramError('Telegram: недійсний токен бота. Оновіть TELEGRAM_BOT_TOKEN.');
  if (status === 403) return new TelegramError('Telegram: бот не має доступу до чату. Розблокуйте бота, надішліть /start або перевірте його права в групі.');
  if (status === 400 && /chat not found/i.test(description)) return new TelegramError('Telegram: чат не знайдено. Перевірте TELEGRAM_CHAT_ID та надішліть боту /start.');
  if (status === 429) return new TelegramError('Telegram: забагато запитів. Буде повторна спроба.', retryAfter);
  return new TelegramError(`Telegram: помилка API (${status}). Буде повторна спроба.`);
}

export function formatTelegramOrder(order: Order): string {
  const time = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', dateStyle: 'short', timeStyle: 'medium', hour12: false }).format(new Date(order.created_at));
  const header = [
    '🌐 НОВЕ ЗАМОВЛЕННЯ!', `№${order.id.slice(0, 8)} · IKRA DeLuxe`, '',
    `👤 Клієнт: ${oneLine(order.customer_name)}`, `📱 Телефон: ${oneLine(order.customer_phone)}`,
    `📍 Місто: ${oneLine(order.city)}`, `📦 Адреса НП: ${oneLine(order.delivery_address || 'уточнити у клієнта')}`, '', '🛍 Товари:',
  ].join('\n');
  const footer = [
    '', `💰 Загальна сума: ${order.total.toFixed(2)} грн`, ...(order.comment ? [`💬 Коментар: ${oneLine(order.comment)}`] : []), '',
    '📊 ДЖЕРЕЛО ЗАМОВЛЕННЯ:', `🎯 Source: ${oneLine(order.source || 'direct')}`,
    ...(order.utm_medium ? [`Medium: ${oneLine(order.utm_medium)}`] : []),
    ...(order.utm_campaign ? [`Campaign: ${oneLine(order.utm_campaign)}`] : []), '',
    `🌍 IP адреса: ${oneLine(order.customer_ip || 'не визначено')}`, `⏰ Час замовлення (Київ): ${time}`,
  ].join('\n');
  const items = order.items.map(item => `• ${oneLine(item.name)}${item.weight ? ` (${oneLine(item.weight)})` : ''} × ${item.quantity} = ${(item.price * item.quantity).toFixed(2)} грн`).join('\n');
  const omission = '\n… Повний склад — в адмінці.';
  const budget = 4000 - header.length - footer.length - 2;
  // Preserve the total, attribution and IP even when a long basket must be shortened.
  const basket = items.length <= budget ? items : items.slice(0, Math.max(0, budget - omission.length)).replace(/[\uD800-\uDBFF]$/, '') + omission;
  return `${header}\n${basket}\n${footer}`;
}

export async function deliverTelegram(env: Env, orderId: string, fetcher: typeof fetch = fetch): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return;
  const now = Date.now();
  const claim = await env.DB.prepare(`UPDATE telegram_outbox SET lease_until=?,attempts=attempts+1
    WHERE order_id=? AND sent_at IS NULL AND next_attempt<=? AND lease_until<=? AND attempts<10 RETURNING attempts`)
    .bind(now + 60_000, orderId, now, now).first<{ attempts: number }>();
  if (!claim) return;
  try {
    const row = await env.DB.prepare('SELECT data FROM orders WHERE id=?').bind(orderId).first<{ data: string }>();
    if (!row) throw new Error('order_missing');
    const order = JSON.parse(row.data) as Order;
    const message = formatTelegramOrder(order);
    const response = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
      signal: AbortSignal.timeout(12_000),
    });
    const result = await response.json() as { ok?: boolean; error_code?: number; description?: string; parameters?: { retry_after?: number } };
    if (!response.ok || !result.ok) {
      const retryAfter = result.parameters?.retry_after;
      throw telegramError(result.error_code || response.status, result.description,
        typeof retryAfter === 'number' && Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 0);
    }
    await env.DB.prepare('UPDATE telegram_outbox SET sent_at=?,lease_until=0,last_error=NULL WHERE order_id=?').bind(Date.now(), orderId).run();
  } catch (reason) {
    // Never log tokens, request URLs, customer details or upstream response bodies.
    await env.DB.prepare('UPDATE telegram_outbox SET next_attempt=?,lease_until=0,last_error=? WHERE order_id=?')
      .bind(Date.now() + Math.max(Math.min(3_600_000, 60_000 * 2 ** claim.attempts), reason instanceof TelegramError ? reason.retryAfter : 0),
        reason instanceof TelegramError ? reason.message : 'Telegram: не вдалося надіслати. Буде повторна спроба.', orderId).run();
  }
}
export async function retryTelegram(env: Env) {
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    const now = Date.now();
    const { results } = await env.DB.prepare(`SELECT order_id FROM telegram_outbox
      WHERE sent_at IS NULL AND next_attempt<=? AND lease_until<=? AND attempts<10 ORDER BY next_attempt LIMIT 5`).bind(now, now).all<{ order_id: string }>();
    for (const row of results) await deliverTelegram(env, row.order_id);
  }
  await env.DB.prepare('DELETE FROM rate_limits WHERE expires<?').bind(Math.floor(Date.now() / 1000) - 86400).run();
}
