import { hash, HttpError, json, rateLimit, readJson, text } from './types';
import type { Env } from './types';
const encoder = new TextEncoder();
const COOKIE = 'ikra_admin';
const LIFETIME = 8 * 60 * 60;
async function key(env: Env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new HttpError(503, 'Вхід ще не налаштовано');
  return crypto.subtle.importKey('raw', encoder.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
function fromHex(value: string) { return Uint8Array.from(value.match(/.{2}/g) ?? [], byte => parseInt(byte, 16)); }
function hex(value: ArrayBuffer) { return [...new Uint8Array(value)].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
const adminLogin = (env: Env) => env.ADMIN_LOGIN || env.ADMIN_EMAIL;
export function configured(env: Env) { return Boolean(adminLogin(env) && /^[a-f0-9]{64}$/.test(env.ADMIN_PASSWORD_SHA256 ?? '') && (env.SESSION_SECRET?.length ?? 0) >= 32); }
export async function isAdmin(request: Request, env: Env): Promise<boolean> {
  if (!configured(env)) return false;
  const token = request.headers.get('cookie')?.split(';').map(item => item.trim()).find(item => item.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!token) return false;
  const [expires, nonce, signature, extra] = token.split('.');
  const now = Math.floor(Date.now() / 1000);
  if (extra || !/^\d{10}$/.test(expires) || Number(expires) <= now || Number(expires) > now + LIFETIME || !/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  // Changing the configured admin credentials also invalidates existing sessions.
  return crypto.subtle.verify('HMAC', await key(env), fromHex(signature), encoder.encode(`${expires}.${nonce}.${adminLogin(env)}.${env.ADMIN_PASSWORD_SHA256}`));
}
function cookie(request: Request, token: string, seconds: number) {
  return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${seconds}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function login(request: Request, env: Env) {
  if (!configured(env)) throw new HttpError(503, 'Вхід ще не налаштовано. Додайте секрети адміністратора в Cloudflare.');
  await rateLimit(env, request, 'login', 10, 900);
  const data = await readJson(request, 2000);
  const login = text(data.login ?? data.email, 'Логін', 254, 3).toLowerCase();
  const password = text(data.password, 'Пароль', 256, 1);
  const passwordHash = await hash(password);
  // HMAC verification performs constant-time comparison of the credential hashes.
  const credentialKey = await key(env);
  const expected = await crypto.subtle.sign('HMAC', credentialKey, encoder.encode(env.ADMIN_PASSWORD_SHA256));
  const correct = await crypto.subtle.verify('HMAC', credentialKey, expected, encoder.encode(passwordHash));
  if (login !== adminLogin(env)?.toLowerCase() || !correct) throw new HttpError(401, 'Невірний логін або пароль');
  const payload = `${Math.floor(Date.now() / 1000) + LIFETIME}.${crypto.randomUUID().replaceAll('-', '')}`;
  const signature = hex(await crypto.subtle.sign('HMAC', credentialKey, encoder.encode(`${payload}.${adminLogin(env)}.${env.ADMIN_PASSWORD_SHA256}`)));
  return json({ authorized: true }, 200, { 'Set-Cookie': cookie(request, `${payload}.${signature}`, LIFETIME) });
}
export function logout(request: Request) { return json({ authorized: false }, 200, { 'Set-Cookie': cookie(request, '', 0) }); }
