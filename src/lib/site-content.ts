import definitions from '../data/site-content.json';
import { api, cloudMode } from './backend';

export type ContentField = { key: string; label: string; type: string; value?: string; advanced?: boolean };
export type ContentDefinition = { id: string; title: string; description: string; fields: ContentField[]; itemFields: ContentField[]; items: Record<string, string>[] };
export type ContentSection = { visible: boolean; values: Record<string, string>; items: Record<string, string>[] };
export type SiteContent = Record<string, ContentSection>;
export const contentDefinitions: ContentDefinition[] = definitions;
export const CONTENT_KEY = 'ikra_site_content_v1';
export const CONTENT_EVENT = 'ikra-content-changed';

export function normalizeContent(raw: unknown): SiteContent {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return Object.fromEntries(contentDefinitions.map(definition => {
    const entry = source[definition.id];
    const section = entry && typeof entry === 'object' ? entry as Partial<ContentSection> : {};
    const values = Object.fromEntries(definition.fields.map(field => [field.key,
      typeof section.values?.[field.key] === 'string' ? section.values[field.key] : field.value ?? '',
    ]));
    const validItems = Array.isArray(section.items) ? section.items : definition.items;
    const items = validItems.filter(item => item && typeof item === 'object').map((item, index) => ({
      id: typeof item.id === 'string' ? item.id : `${definition.id}-${index}`,
      ...Object.fromEntries(definition.itemFields.map(field => [field.key, typeof item[field.key] === 'string' ? item[field.key] : ''])),
    }));
    return [definition.id, { visible: typeof section.visible === 'boolean' ? section.visible : true, values, items }];
  }));
}

export function readLocalContent(): SiteContent {
  try { return normalizeContent(JSON.parse(localStorage.getItem(CONTENT_KEY) ?? 'null')); }
  catch { return normalizeContent(null); }
}

export async function loadSiteContent(): Promise<SiteContent> {
  if (!cloudMode) return readLocalContent();
  return normalizeContent(await api('/content'));
}

export async function saveContentSection(id: string, section: ContentSection): Promise<SiteContent> {
  const definition = contentDefinitions.find(item => item.id === id);
  if (!definition) throw new Error('Невідомий розділ');
  for (const field of definition.fields) {
    const value = section.values[field.key]?.trim() ?? '';
    if (field.type === 'url' && value && !/^https:\/\//i.test(value)) throw new Error(`${field.label}: вставте посилання з https://`);
    if (field.type === 'image' && value && !/^(\/(?!\/)|https:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(value)) throw new Error(`${field.label}: використайте завантаження, шлях / або посилання https://`);
  }
  if (id === 'contacts' && !/^\+?[\d\s()\-]{9,25}$/.test(section.values.phone ?? '')) throw new Error('Перевірте номер телефону');
  if (definition.itemFields.length) {
    for (const item of section.items) {
      if (definition.itemFields.some(field => !item[field.key]?.trim())) throw new Error('Заповніть усі поля списку або видаліть порожній запис');
    }
  }
  const normalized = normalizeContent({ [id]: section })[id];
  if (cloudMode) {
    await api(`/admin/content/${id}`, { method: 'PUT', body: JSON.stringify(normalized) });
  } else {
    const next = { ...readLocalContent(), [id]: normalized };
    localStorage.setItem(CONTENT_KEY, JSON.stringify(next));
  }
  window.dispatchEvent(new Event(CONTENT_EVENT));
  return { [id]: normalized };
}
