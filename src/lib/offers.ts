import { demoOffers, type OfferBundle } from '../data/offers';
const KEY = 'ikra_deluxe_offers_v1';
export function getOffers(): OfferBundle[] {
  try {
    const raw = localStorage.getItem(KEY);
    const offers: unknown = raw ? JSON.parse(raw) : demoOffers;
    return Array.isArray(offers) ? offers as OfferBundle[] : demoOffers;
  } catch { return demoOffers; }
}
export function saveOffer(offer: OfferBundle): void {
  const next = [...getOffers().filter(x => x.id !== offer.id), offer];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('aurora-store-changed'));
}
export function deleteOffer(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getOffers().filter(x => x.id !== id)));
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
