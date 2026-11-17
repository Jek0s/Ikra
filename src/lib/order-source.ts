export type OrderSource = { source: string; utm_medium?: string; utm_campaign?: string };
const KEY = 'ikra_order_source_v1';
const clean = (value: string | null) => (value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200);

export function sourceFromLocation(href: string, referrer: string): OrderSource {
  const url = new URL(href);
  let referral = '';
  try {
    const previous = new URL(referrer);
    if (previous.hostname !== url.hostname && ['https:', 'http:'].includes(previous.protocol)) referral = previous.hostname;
  } catch { /* Empty or unavailable referrer is a direct visit. */ }
  const medium = clean(url.searchParams.get('utm_medium'));
  const campaign = clean(url.searchParams.get('utm_campaign'));
  return { source: clean(url.searchParams.get('utm_source')) || referral || 'direct',
    ...(medium ? { utm_medium: medium } : {}), ...(campaign ? { utm_campaign: campaign } : {}) };
}

let firstVisit: OrderSource | undefined;
export function getOrderSource(): OrderSource {
  if (firstVisit) return firstVisit;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Partial<OrderSource> | null;
    if (saved && typeof saved.source === 'string' && saved.source.trim()) {
      firstVisit = { source: clean(saved.source),
        ...(typeof saved.utm_medium === 'string' ? { utm_medium: clean(saved.utm_medium) } : {}),
        ...(typeof saved.utm_campaign === 'string' ? { utm_campaign: clean(saved.utm_campaign) } : {}) };
    }
  } catch { /* Attribution must not prevent checkout when storage is unavailable. */ }
  firstVisit ??= sourceFromLocation(window.location.href, document.referrer);
  try { sessionStorage.setItem(KEY, JSON.stringify(firstVisit)); } catch { /* Keep the in-memory value. */ }
  return firstVisit;
}
