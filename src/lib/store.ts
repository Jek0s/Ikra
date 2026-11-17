import { demoProducts } from '../data/demo';
import { getOffers, offerToProduct } from './offers';
import { api, cloudMode, getCatalog } from './backend';
import type { CheckoutPayload, Order, OrderStatus, Product } from '../types';
const PRODUCTS_KEY='ikra_deluxe_products_real_photos_v5'; const ORDERS_KEY='ikra_deluxe_orders_v5';
function read<T>(key:string, fallback:T):T { try { const data=localStorage.getItem(key); return data?JSON.parse(data) as T:fallback; } catch {return fallback;} }
function write<T>(key:string,value:T){localStorage.setItem(key,JSON.stringify(value)); window.dispatchEvent(new Event('aurora-store-changed'));}
function getLocalProducts(): Product[] {
 const products = read<Product[]>(PRODUCTS_KEY, demoProducts);
 const migrationKey = 'ikra_catalog_seven_v1';
 if (localStorage.getItem(migrationKey)) return products;
 const updated = products.map(product => product.image === '/products/orange.svg' && product.name === 'Горбуша' ? {...product, image: '/products/pink-salmon.png'} : product);
 const char = demoProducts.find(product => product.id === 'c7')!;
 if (!updated.some(product => product.id === char.id || product.name === char.name)) updated.push(char);
 localStorage.setItem(PRODUCTS_KEY, JSON.stringify(updated));
 localStorage.setItem(migrationKey, '1');
 return updated;
}
export async function getProducts(): Promise<Product[]> {
 if (cloudMode) return (await getCatalog()).products;
 return getLocalProducts();
}
export async function saveProduct(product: Product): Promise<void> {
 if (cloudMode) { await api('/admin/products', { method: 'PUT', body: JSON.stringify(product) }); return; }
 const list = getLocalProducts();
 const exists = list.some(item => item.id === product.id);
 write(PRODUCTS_KEY, exists ? list.map(item => item.id === product.id ? product : item) : [...list, product]);
}
export async function deleteProduct(id: string): Promise<void> {
 if (cloudMode) { await api(`/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' }); return; }
 write(PRODUCTS_KEY, getLocalProducts().filter(item => item.id !== id));
}
export async function submitOrder(payload: CheckoutPayload, idempotencyKey: string = crypto.randomUUID()): Promise<string> {
 if (cloudMode) {
  const data = await api<{ id: string }>('/orders', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload) });
  return data.id;
 }
 const products = [...getLocalProducts(), ...(await getOffers()).filter(offer => offer.active).map(offerToProduct)];
 const items = payload.items.map(item => {
  const product = products.find(value => value.id === item.productId && value.active);
  if (!product) throw new Error('Товар більше недоступний');
  return { product_id: product.id, name: product.name, weight: product.weight, price: product.price, quantity: item.quantity };
 });
 const order: Order = { id: crypto.randomUUID(), customer_name: payload.customer_name, customer_phone: payload.customer_phone, city: payload.city, comment: payload.comment, delivery_address: payload.delivery_address, source: payload.source ?? 'direct', utm_medium: payload.utm_medium, utm_campaign: payload.utm_campaign, items,
  total: items.reduce((sum, item) => sum + item.price * item.quantity, 0), status: 'new', created_at: new Date().toISOString() };
 write(ORDERS_KEY, [order, ...read<Order[]>(ORDERS_KEY, [])]);
 return order.id;
}
export async function getOrders(page = 0): Promise<Order[]> {
 if (cloudMode) return api<Order[]>(`/admin/orders?page=${page}`);
 return read<Order[]>(ORDERS_KEY, []).slice(page * 100, (page + 1) * 100);
}
export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
 if (cloudMode) { await api(`/admin/orders/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ status }) }); return; }
 write(ORDERS_KEY, read<Order[]>(ORDERS_KEY, []).map(order => order.id === id ? { ...order, status } : order));
}
export async function retryOrderTelegram(id: string): Promise<void> {
 await api(`/admin/orders/${encodeURIComponent(id)}/telegram`, { method: 'POST' });
}
export async function uploadProductImage(file: File): Promise<string> {
 if (cloudMode) {
  const body = new FormData(); body.set('file', file);
  const result = await api<{ url: string }>('/admin/images', { method: 'POST', body });
  return result.url;
 }
 return new Promise((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('Помилка читання файлу')); reader.readAsDataURL(file);
 });
}
