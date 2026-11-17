import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { CONTENT_EVENT, CONTENT_KEY, loadSiteContent, normalizeContent, readLocalContent, saveContentSection } from '../lib/site-content';
import type { ContentSection, SiteContent } from '../lib/site-content';
import { cloudMode } from '../lib/backend';

function useContentState() {
  const [content, setContent] = useState<SiteContent>(() => cloudMode ? normalizeContent(null) : readLocalContent());
  const [error, setError] = useState('');
  const [ready, setReady] = useState(!cloudMode);
  const reload = useCallback(async () => {
    try { const next = await loadSiteContent(); setContent(next); setReady(true); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити розділи'); }
  }, []);
  useEffect(() => {
    void reload();
    const storage = (event: StorageEvent) => { if (event.key === CONTENT_KEY || event.key === null) void reload(); };
    const focus = () => { void reload(); };
    window.addEventListener(CONTENT_EVENT, focus);
    window.addEventListener('storage', storage);
    window.addEventListener('focus', focus);
    // Refresh public content even when another device saves an edit.
    const timer = cloudMode ? window.setInterval(() => { if (!document.hidden) void reload(); }, 30000) : undefined;
    return () => { window.removeEventListener(CONTENT_EVENT, focus); window.removeEventListener('storage', storage); window.removeEventListener('focus', focus); window.clearInterval(timer); };
  }, [reload]);
  const save = useCallback(async (id: string, section: ContentSection) => {
    const saved = await saveContentSection(id, section);
    setContent(current => ({ ...current, ...saved }));
  }, []);
  const text = useCallback((id: string, key: string) => content[id]?.values[key] ?? '', [content]);
  const visible = useCallback((id: string) => content[id]?.visible ?? true, [content]);
  const items = useCallback((id: string) => content[id]?.items ?? [], [content]);
  const contacts = useMemo(() => {
    const values = content.contacts.values;
    const phone = values.phone.replace(/[^\d+]/g, '');
    const digits = phone.replace(/\D/g, '');
    return { ...values, phone: values.phone, phoneHref: `tel:${phone}`, instagram: values.instagram, instagramLabel: values.instagramLabel,
      tiktok: values.tiktok, tiktokLabel: values.tiktokLabel, telegram: values.telegram,
      whatsapp: `https://wa.me/${digits}`, viber: `viber://chat?number=${encodeURIComponent(phone)}` };
  }, [content.contacts]);
  useEffect(() => {
    document.title = content.seo.values.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', content.seo.values.description);
    document.querySelector('link[rel="icon"]')?.setAttribute('href', content.seo.values.logo);
  }, [content.seo]);
  return { content, text, visible, items, contacts, save, reload, ready, error };
}
const SiteContentContext = createContext<ReturnType<typeof useContentState> | null>(null);
export function SiteContentProvider({ children }: PropsWithChildren) {
  const value = useContentState();
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}
export function useSiteContent() {
  const value = useContext(SiteContentContext);
  if (!value) throw new Error('SiteContentProvider missing');
  return value;
}
