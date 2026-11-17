import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions, FormData } from 'miniflare';

let mf, db, cookie;
let telegramFailure = false;
let telegramErrorResponse = null;
const messages = [];
const password = 'local-test-only-random-admin-password';
async function request(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  return mf.dispatchFetch(`https://shop.example/api${path}`, { method, headers: {
    ...(body ? { 'Content-Type': 'application/json' } : {}), ...(auth ? { Cookie: cookie } : {}), ...headers,
  }, body: body ? JSON.stringify(body) : undefined });
}
async function login() {
  const response = await request('/auth/login', { method: 'POST', body: { login: 'ikra_admin', password } });
  assert.equal(response.status, 200, await response.clone().text());
  const header = response.headers.get('set-cookie');
  assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Strict/); assert.match(header, /Secure/);
  cookie = header.split(';')[0];
}
async function waitFor(expression) {
  for (let n = 0; n < 80; n++) { if (await expression()) return; await new Promise(resolve => setTimeout(resolve, 25)); }
  assert.fail('Background task did not finish');
}
const order = (items = [{ productId: 'c1', quantity: 2 }, { productId: 'offer:maxi', quantity: 1 }]) => ({ customer_name: 'Тестовий покупець', customer_phone: '+380501234567', city: 'Київ', comment: 'Тест', items, total: 1 });
const submit = (key, body = order(), headers = {}) => request('/orders', { method: 'POST', body, headers: { 'Idempotency-Key': key, ...headers } });

before(async () => {
  const result = await build({ entryPoints: ['worker/index.ts'], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: result.outputFiles[0].text, compatibilityDate: '2026-10-18', d1Databases: ['DB'],
    bindings: { ADMIN_LOGIN: 'ikra_admin', ADMIN_PASSWORD_SHA256: createHash('sha256').update(password).digest('hex'), SESSION_SECRET: 'test-session-secret-at-least-32-characters', TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_CHAT_ID: '12345', CLOUDINARY_CLOUD_NAME: 'test', CLOUDINARY_API_KEY: 'test-key', CLOUDINARY_API_SECRET: 'test-secret' },
    outboundService: async incoming => {
      const url = new URL(incoming.url);
      if (url.hostname === 'api.telegram.org') {
        messages.push(await incoming.json());
        if (telegramErrorResponse) return Response.json({ ok: false, error_code: telegramErrorResponse.status, ...telegramErrorResponse.body }, { status: telegramErrorResponse.status });
        return Response.json({ ok: !telegramFailure }, { status: telegramFailure ? 503 : 200 });
      }
      if (url.hostname === 'api.cloudinary.com') {
        const data = await incoming.formData();
        assert.equal(data.get('api_key'), 'test-key');
        const expected = createHash('sha256').update(`folder=ikra-deluxe&timestamp=${data.get('timestamp')}test-secret`).digest('hex');
        assert.equal(data.get('signature'), expected);
        return Response.json({ secure_url: 'https://res.cloudinary.com/test/image/upload/photo.png' });
      }
      throw new Error('Unexpected outbound request');
    },
  }));
  db = await mf.getD1Database('DB');
  for (const file of ['migrations/0001_schema.sql', 'migrations/0002_catalog.sql']) {
    const sql = await readFile(file, 'utf8');
    for (const statement of sql.split(/;\s*\n/).map(value => value.trim()).filter(Boolean)) await db.prepare(statement).run();
  }
});
after(async () => { await mf?.dispose(); });

test('admin login, signed cookie, private endpoints and cross-origin protection', async () => {
  assert.equal((await request('/admin/orders')).status, 401);
  assert.equal((await request('/admin/products', { method: 'PUT', body: {} })).status, 401);
  assert.equal((await request('/auth/login', { method: 'POST', body: { login: 'ikra_admin', password: 'incorrect' } })).status, 401);
  await login();
  assert.equal((await (await request('/auth/session', { auth: true })).json()).authorized, true);
  assert.equal((await request('/auth/login', { method: 'POST', body: { login: 'another_admin', password } })).status, 401);
  assert.equal((await request('/auth/register', { method: 'POST', body: { login: 'another_admin', password } })).status, 404);
  const tampered = cookie.replace(/.$/, cookie.endsWith('0') ? '1' : '0');
  assert.equal((await request('/admin/orders', { headers: { Cookie: tampered } })).status, 401);
  assert.equal((await request('/admin/products', { method: 'PUT', body: {}, auth: true, headers: { Origin: 'https://other.example' } })).status, 403);
  assert.equal((await request('/admin/products', { method: 'PUT', body: {}, auth: true, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
});

test('D1 catalogue edits persist; unpublished products and offers stay private', async () => {
  const catalog = await (await request('/catalog', { auth: true })).json();
  assert.equal(catalog.products.length, 7); assert.equal(catalog.offers.length, 7);
  const product = { ...catalog.products[0], id: 'test-hidden', name: 'Прихований товар', active: false, price: 123.45 };
  assert.equal((await request('/admin/products', { method: 'PUT', body: product, auth: true })).status, 200);
  assert.equal((await (await request('/catalog')).json()).products.some(item => item.id === product.id), false);
  assert.equal((await (await request('/catalog', { auth: true })).json()).products.find(item => item.id === product.id).price, 123.45);
  assert.equal((await submit('hidden-product-request', order([{ productId: product.id, quantity: 1 }]))).status, 409);
  assert.equal((await request('/admin/products', { method: 'PUT', body: { ...product, price: -1 }, auth: true })).status, 400);
  assert.equal((await request('/admin/offers', { method: 'PUT', body: { ...catalog.offers[0], active: false }, auth: true })).status, 200);
  assert.equal((await (await request('/catalog')).json()).offers.some(item => item.id === 'maxi'), false);
  await request('/admin/offers', { method: 'PUT', body: catalog.offers[0], auth: true });
});

test('checkout derives prices from D1, saves an order and sends Telegram once', async () => {
  const checkout = { ...order(), delivery_address: 'Відділення №12', source: 'instagram', utm_medium: 'social', utm_campaign: 'autumn', customer_ip: '1.2.3.4' };
  const response = await submit('checkout-unique-key-1', checkout, { 'CF-Connecting-IP': '203.0.113.42', 'X-Forwarded-For': '1.2.3.4' });
  assert.equal(response.status, 201, await response.clone().text());
  const { id } = await response.json();
  const saved = await db.prepare('SELECT data FROM orders WHERE id=?').bind(id).first();
  const stored = JSON.parse(saved.data);
  assert.equal(stored.total, 699 * 2 + 1999);
  assert.equal(stored.customer_ip, '203.0.113.42');
  assert.equal(stored.delivery_address, 'Відділення №12');
  assert.equal(stored.source, 'instagram');
  assert.equal(stored.utm_medium, 'social');
  assert.equal(stored.items.find(item => item.product_id === 'c1').weight, '500 г');
  await waitFor(async () => (await db.prepare('SELECT sent_at FROM telegram_outbox WHERE order_id=?').bind(id).first()).sent_at);
  assert.equal(messages.length, 1); assert.match(messages[0].text, /3397\.00/);
  assert.match(messages[0].text, /IP адреса: 203\.0\.113\.42/);
  assert.match(messages[0].text, /Source: instagram/);
  assert.match(messages[0].text, /Адреса НП: Відділення №12/);
  assert.match(messages[0].text, /Час замовлення \(Київ\):/);
  const again = await submit('checkout-unique-key-1', checkout, { 'CF-Connecting-IP': '203.0.113.43' });
  assert.equal((await again.json()).id, id);
  assert.equal(messages.length, 1);
  assert.equal((await submit('checkout-unique-key-1', { ...checkout, city: 'Львів' })).status, 409);
  const orders = await (await request('/admin/orders', { auth: true })).json();
  assert.equal(orders.find(item => item.id === id).telegram_status, 'sent');
  assert.equal((await request(`/admin/orders/${id}`, { method: 'PUT', body: { status: 'shipped' }, auth: true })).status, 200);
  assert.equal((await (await request('/admin/orders', { auth: true })).json()).find(item => item.id === id).status, 'shipped');
});

test('concurrent duplicate checkout creates a single order and notification', async () => {
  const responses = await Promise.all([submit('concurrent-request-key'), submit('concurrent-request-key')]);
  const ids = await Promise.all(responses.map(async response => { assert.ok(response.ok, await response.clone().text()); return (await response.json()).id; }));
  assert.equal(ids[0], ids[1]);
  const count = await db.prepare('SELECT COUNT(*) AS count FROM orders WHERE idempotency_key=?').bind('concurrent-request-key').first();
  assert.equal(count.count, 1);
  await waitFor(async () => (await db.prepare('SELECT sent_at FROM telegram_outbox WHERE order_id=?').bind(ids[0]).first()).sent_at);
});

test('Telegram failure preserves the order; an admin can retry delivery', async () => {
  telegramFailure = true;
  const response = await submit('telegram-retry-order');
  assert.equal(response.status, 201);
  const { id } = await response.json();
  await waitFor(async () => (await db.prepare('SELECT last_error FROM telegram_outbox WHERE order_id=?').bind(id).first()).last_error);
  const pending = await db.prepare('SELECT sent_at,attempts FROM telegram_outbox WHERE order_id=?').bind(id).first();
  assert.equal(pending.sent_at, null); assert.equal(pending.attempts, 1);
  assert.ok(await db.prepare('SELECT id FROM orders WHERE id=?').bind(id).first());
  telegramFailure = false;
  for (const [status, description, expected] of [
    [401, 'Unauthorized secret-test-token', /недійсний токен/],
    [400, 'Bad Request: chat not found secret-test-token', /чат не знайдено/],
    [403, 'Forbidden: bot was blocked secret-test-token', /не має доступу/],
    [429, 'Too Many Requests secret-test-token', /забагато запитів/],
  ]) {
    telegramErrorResponse = { status, body: { description, parameters: { retry_after: 600 } } };
    const beforeRetry = Date.now();
    const retry = await request(`/admin/orders/${id}/telegram`, { method: 'POST', auth: true });
    assert.equal(retry.status, 502);
    const error = (await retry.json()).error;
    assert.match(error, expected);
    assert.ok(!error.includes('secret-test-token'));
    const orders = await (await request('/admin/orders', { auth: true })).json();
    assert.equal(orders.find(item => item.id === id).telegram_error, error);
    const outbox = await db.prepare('SELECT sent_at,next_attempt FROM telegram_outbox WHERE order_id=?').bind(id).first();
    assert.equal(outbox.sent_at, null);
    if (status === 429) assert.ok(outbox.next_attempt >= beforeRetry + 600_000);
  }
  telegramErrorResponse = null;
  assert.equal((await request(`/admin/orders/${id}/telegram`, { method: 'POST', auth: true })).status, 200);
  assert.ok((await db.prepare('SELECT sent_at FROM telegram_outbox WHERE order_id=?').bind(id).first()).sent_at);
  const delivered = (await (await request('/admin/orders', { auth: true })).json()).find(item => item.id === id);
  assert.equal(delivered.telegram_status, 'sent');
  assert.equal(delivered.telegram_error, null);
  const messageCount = messages.length;
  assert.equal((await request(`/admin/orders/${id}/telegram`, { method: 'POST', auth: true })).status, 200);
  assert.equal(messages.length, messageCount);
  assert.equal((await request('/admin/orders/missing-order/telegram', { method: 'POST', auth: true })).status, 404);
});

test('invalid checkout quantities, duplicate lines and body limits are rejected', async () => {
  assert.equal((await submit('invalid-order-key-1', order([{ productId: 'c1', quantity: 0 }]))).status, 400);
  assert.equal((await submit('invalid-order-key-2', order([{ productId: 'c1', quantity: 1.5 }]))).status, 400);
  assert.equal((await submit('invalid-order-key-3', order([{ productId: 'c1', quantity: 1 }, { productId: 'c1', quantity: 1 }]))).status, 400);
  assert.equal((await submit('invalid-order-key-4', { ...order(), customer_name: 'x'.repeat(25000) })).status, 413);
});

test('section updates preserve other sections and reject unsafe links', async () => {
  const hero = { visible: true, values: {}, items: [] };
  const definitions = JSON.parse(await readFile('src/data/site-content.json', 'utf8'));
  for (const field of definitions.find(item => item.id === 'hero').fields) hero.values[field.key] = field.value;
  const footer = structuredClone(hero);
  footer.values = Object.fromEntries(definitions.find(item => item.id === 'footer').fields.map(field => [field.key, field.value]));
  assert.equal((await request('/admin/content/hero', { method: 'PUT', body: hero, auth: true })).status, 200);
  assert.equal((await request('/admin/content/footer', { method: 'PUT', body: footer, auth: true })).status, 200);
  const content = await (await request('/content')).json();
  assert.deepEqual(content.hero, hero); assert.deepEqual(content.footer, footer);
  const imageKey = definitions.find(item => item.id === 'hero').fields.find(field => field.type === 'image').key;
  hero.values[imageKey] = 'javascript:alert(1)';
  assert.equal((await request('/admin/content/hero', { method: 'PUT', body: hero, auth: true })).status, 400);
});

test('image uploads are admin-only, validate file bytes and use a signed Cloudinary request', async () => {
  const body = new FormData(); body.set('file', new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10])], 'photo.png', { type: 'image/png' }));
  assert.equal((await mf.dispatchFetch('https://shop.example/api/admin/images', { method: 'POST', body })).status, 401);
  const response = await mf.dispatchFetch('https://shop.example/api/admin/images', { method: 'POST', body, headers: { Cookie: cookie } });
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).url, 'https://res.cloudinary.com/test/image/upload/photo.png');
  const invalid = new FormData(); invalid.set('file', new File(['not-a-picture'], 'photo.png', { type: 'image/png' }));
  assert.equal((await mf.dispatchFetch('https://shop.example/api/admin/images', { method: 'POST', body: invalid, headers: { Cookie: cookie } })).status, 400);
});

test('invalid edge IP stays unknown; IPv6 is preserved and delivery address affects idempotency', async () => {
  const response = await submit('ipv6-metadata-order', { ...order(), customer_ip: '1.2.3.4' }, { 'CF-Connecting-IP': '240.0.0.1', 'CF-Connecting-IPv6': '2001:db8::42' });
  assert.equal(response.status, 201);
  const { id } = await response.json();
  const stored = JSON.parse((await db.prepare('SELECT data FROM orders WHERE id=?').bind(id).first()).data);
  assert.equal(stored.customer_ip, '2001:db8::42');
  assert.equal(stored.source, 'direct');
  await waitFor(async () => (await db.prepare('SELECT sent_at FROM telegram_outbox WHERE order_id=?').bind(id).first()).sent_at);
  assert.equal((await submit('ipv6-metadata-order', { ...order(), delivery_address: 'Інше відділення' })).status, 409);
  const noIpResponse = await submit('no-client-ip-order', { ...order(), customer_ip: '1.2.3.4' }, { 'CF-Connecting-IP': 'not-an-ip', 'X-Forwarded-For': '1.2.3.4' });
  assert.equal(noIpResponse.status, 201);
  const unknownId = (await noIpResponse.json()).id;
  const noIp = JSON.parse((await db.prepare('SELECT data FROM orders WHERE id=?').bind(unknownId).first()).data);
  assert.equal(noIp.customer_ip, '');
  await waitFor(async () => (await db.prepare('SELECT sent_at FROM telegram_outbox WHERE order_id=?').bind(unknownId).first()).sent_at);
});

test('logout removes the browser session; login attempts are limited', async () => {
  const response = await request('/auth/logout', { method: 'POST', auth: true });
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await (await request('/auth/session')).json()).authorized, false);
  for (let i = 0; i < 11; i++) await request('/auth/login', { method: 'POST', body: { login: 'ikra_admin', password: 'wrong' } });
  assert.equal((await request('/auth/login', { method: 'POST', body: { login: 'ikra_admin', password } })).status, 429);
});
