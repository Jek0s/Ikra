import { api, cloudMode, getCatalog } from './backend';
import { demoOffers, type OfferBundle } from '../data/offers';
const KEY = 'ikra_deluxe_offers_v1';
export function getLocalOffers(): OfferBundle[] {
  try {
    const raw = localStorage.getItem(KEY);
    const offers: unknown = raw ? JSON.parse(raw) : demoOffers;
    if (!Array.isArray(offers)) return demoOffers;
    const list = offers as OfferBundle[];
    if (raw && !localStorage.getItem('ikra_maxi_added_v1')) {
      if (!list.some(offer => offer.id === 'maxi')) list.unshift(demoOffers.find(offer => offer.id === 'maxi')!);
      localStorage.setItem(KEY, JSON.stringify(list));
      localStorage.setItem('ikra_maxi_added_v1', '1');
    }
    return list;
  } catch { return demoOffers; }
}
export async function getOffers(): Promise<OfferBundle[]> {
  return cloudMode ? (await getCatalog()).offers : getLocalOffers();
}
export async function saveOffer(offer: OfferBundle): Promise<void> {
  if (cloudMode) { await api('/admin/offers', { method: 'PUT', body: JSON.stringify(offer) }); return; }
  const list = getLocalOffers();
  const next = list.some(item => item.id === offer.id) ? list.map(item => item.id === offer.id ? offer : item) : [...list, offer];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('aurora-store-changed'));
}
export async function deleteOffer(id: string): Promise<void> {
  if (cloudMode) { await api(`/admin/offers/${encodeURIComponent(id)}`, { method: 'DELETE' }); return; }
  localStorage.setItem(KEY, JSON.stringify(getLocalOffers().filter(item => item.id !== id)));
  window.dispatchEvent(new Event('aurora-store-changed'));
}
export function offerToProduct(offer: OfferBundle) {
  return {
    id: `offer:${offer.id}`, name: offer.title, subtitle: offer.description,
    category: 'sets' as const, price: offer.price, old_price: offer.oldPrice,
    weight: offer.weight, image: offer.image,
    description: offer.items.join('\n'), badge: offer.promo, active: offer.active, featured: false,
  };
}
