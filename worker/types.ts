export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_LOGIN?: string;
  ADMIN_EMAIL?: string; // Compatibility with previously configured credentials.
  ADMIN_PASSWORD_SHA256?: string;
  SESSION_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const json = (data: unknown, status = 200, headers: HeadersInit = {}) => Response.json(data, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});
export async function readJson(request: Request, limit = 100_000): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Очікується JSON');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Порожній запит');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new HttpError(413, 'Запит завеликий'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let data: unknown;
  try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400, 'Некоректний JSON'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Некоректний запит');
  return data as Record<string, unknown>;
}
export function text(value: unknown, label: string, max = 500, min = 0): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw new HttpError(400, `Перевірте поле «${label}»`);
  return value.trim();
}
export async function hash(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function rateLimit(env: Env, request: Request, action: string, maximum: number, seconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  const key = `${action}:${await hash(ip)}`;
  const result = await env.DB.prepare(`INSERT INTO rate_limits(key,count,expires) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<=? THEN 1 ELSE count+1 END,
    expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END RETURNING count`).bind(key, now + seconds, now, now).first<{ count: number }>();
  if (!result || result.count > maximum) throw new HttpError(429, 'Забагато спроб. Спробуйте трохи пізніше.');
}
