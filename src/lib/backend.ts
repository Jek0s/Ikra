import type { Product } from '../types';
import type { OfferBundle } from '../data/offers';

// A published build always uses the same-origin Worker API. Plain Vite remains a local demo.
export const cloudMode = import.meta.env.PROD || import.meta.env.VITE_BACKEND === 'd1';
export const AUTH_EVENT = 'ikra-auth-changed';
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { ...init, credentials: 'same-origin', headers: {
    ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...init.headers,
  } });
  let data: unknown;
  try { data = await response.json(); } catch { throw new Error('Сервер недоступний. Перевірте підключення Cloudflare.'); }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event(AUTH_EVENT));
    throw new Error(typeof data === 'object' && data && 'error' in data ? String(data.error) : 'Не вдалося виконати запит');
  }
  return data as T;
}
let catalogRequest: Promise<{ products: Product[]; offers: OfferBundle[] }> | null = null;
export function getCatalog() {
  if (!catalogRequest) catalogRequest = api<{ products: Product[]; offers: OfferBundle[] }>('/catalog').finally(() => { catalogRequest = null; });
  return catalogRequest;
}
export type Session = { authorized: boolean; configured: boolean };
export const getSession = () => api<Session>('/auth/session');
export async function loginAdmin(login: string, password: string) {
  await api('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) });
  window.dispatchEvent(new Event(AUTH_EVENT));
}
export async function logoutAdmin() {
  await api('/auth/logout', { method: 'POST' });
  window.dispatchEvent(new Event(AUTH_EVENT));
}
export type BackendStatus = { telegram: boolean; images: boolean; pendingNotifications: number; orderCount: number; orderTotal: number };
export const getBackendStatus = () => api<BackendStatus>('/admin/status');
