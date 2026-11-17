import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
async function load(entry) {
  const result = await build({ entryPoints: [entry], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const { sourceFromLocation, getOrderSource } = await load('src/lib/order-source.ts');
const { formatTelegramOrder } = await load('worker/telegram.ts');

test('attribution uses UTM, external referral hostname or direct without storing referrer paths', () => {
  assert.deepEqual(sourceFromLocation('https://shop.example/?utm_source=instagram&utm_medium=social&utm_campaign=autumn', 'https://google.com/search?private=value'), { source: 'instagram', utm_medium: 'social', utm_campaign: 'autumn' });
  assert.deepEqual(sourceFromLocation('https://shop.example/', 'https://google.com/search?private=value'), { source: 'google.com' });
  assert.deepEqual(sourceFromLocation('https://shop.example/', 'https://shop.example/admin'), { source: 'direct' });
  assert.deepEqual(sourceFromLocation('https://shop.example/', ''), { source: 'direct' });
});

test('first visit attribution survives navigation and unavailable browser storage', () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousStorage = globalThis.sessionStorage;
  try {
    globalThis.window = { location: { href: 'https://shop.example/?utm_source=instagram' } };
    globalThis.document = { referrer: '' };
    globalThis.sessionStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
    assert.equal(getOrderSource().source, 'instagram');
    globalThis.window.location.href = 'https://shop.example/admin';
    assert.equal(getOrderSource().source, 'instagram');
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
    if (previousStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previousStorage;
  }
});

const baseOrder = { id: 'test-id', customer_name: 'Тест', customer_phone: '+380501234567', city: 'Київ', delivery_address: 'Відділення №12', comment: '', total: 599, status: 'new', created_at: '2026-10-18T12:00:00.000Z', customer_ip: '203.0.113.42', source: 'instagram', items: [{ product_id: 'c1', name: 'Лосось', weight: '500 г', price: 599, quantity: 1 }] };

test('notification matches the example with server timestamp in Kyiv and item weight', () => {
  const message = formatTelegramOrder(baseOrder);
  assert.match(message, /НОВЕ ЗАМОВЛЕННЯ!/);
  assert.match(message, /Лосось \(500 г\) × 1 = 599\.00 грн/);
  assert.match(message, /Адреса НП: Відділення №12/);
  assert.match(message, /Source: instagram/);
  assert.match(message, /IP адреса: 203\.0\.113\.42/);
  assert.match(message, /15:00:00/);
});

test('long baskets are shortened while keeping total, source, IP and time', () => {
  const message = formatTelegramOrder({ ...baseOrder, items: Array.from({ length: 30 }, (_, index) => ({ ...baseOrder.items[0], name: `Дуже довга назва ${index} `.repeat(10) })) });
  assert.ok(message.length <= 4000);
  assert.match(message, /Повний склад — в адмінці/);
  assert.match(message, /Загальна сума: 599\.00/);
  assert.match(message, /IP адреса: 203\.0\.113\.42/);
  assert.match(message, /Source: instagram/);
  assert.match(message, /Час замовлення/);
});

test('old orders without metadata still produce a valid notification', () => {
  const message = formatTelegramOrder({ ...baseOrder, delivery_address: undefined, customer_ip: undefined, source: undefined });
  assert.match(message, /IP адреса: не визначено/);
  assert.match(message, /Source: direct/);
  assert.match(message, /уточнити у клієнта/);
});
