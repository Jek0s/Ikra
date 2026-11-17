import definitions from '../src/data/site-content.json';
import type { Product } from '../src/types';
import type { OfferBundle } from '../src/data/offers';
import { HttpError, text } from './types';

export function image(value: unknown): string {
  const result = text(value, 'Фото', 2000, 1);
  if (!/^(\/(?!\/)|https:\/\/)/i.test(result)) throw new HttpError(400, 'Вкажіть шлях / або посилання https:// для фото');
  return result;
}
function price(value: unknown, optional = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < (optional ? 0 : 0.01) || value > 1_000_000 || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) throw new HttpError(400, 'Некоректна ціна');
  return value;
}
function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new HttpError(400, 'Некоректний статус публікації');
  return value;
}
function id(value: unknown): string {
  const result = text(value, 'Ідентифікатор', 100, 1);
  if (!/^[a-zA-Z0-9_-]+$/.test(result)) throw new HttpError(400, 'Некоректний ідентифікатор');
  return result;
}
export function product(data: Record<string, unknown>): Product {
  const category = text(data.category, 'Категорія', 10);
  if (!['red', 'black', 'sets', 'other'].includes(category)) throw new HttpError(400, 'Невідома категорія');
  return { id: id(data.id), name: text(data.name, 'Назва', 180, 1), subtitle: text(data.subtitle, 'Підзаголовок', 500),
    category: category as Product['category'], price: price(data.price), old_price: data.old_price === null ? null : price(data.old_price, true),
    weight: text(data.weight, 'Вага', 100), image: image(data.image), description: text(data.description, 'Опис', 5000),
    badge: data.badge == null ? null : text(data.badge, 'Бейдж', 100), active: bool(data.active), featured: bool(data.featured) };
}
export function offer(data: Record<string, unknown>): OfferBundle {
  if (!Array.isArray(data.items) || data.items.length > 50) throw new HttpError(400, 'Перевірте склад набору');
  return { id: id(data.id), title: text(data.title, 'Назва', 180, 1), promo: text(data.promo, 'Акція', 100), description: text(data.description, 'Опис', 5000),
    image: image(data.image), weight: text(data.weight, 'Вага', 100), price: price(data.price), oldPrice: price(data.oldPrice, true),
    items: data.items.map(item => text(item, 'Склад набору', 200, 1)), note: text(data.note, 'Примітка', 500), active: bool(data.active) };
}
export function section(sectionId: string, data: Record<string, unknown>) {
  const definition = definitions.find(item => item.id === sectionId);
  if (!definition) throw new HttpError(404, 'Невідомий розділ');
  if (!data.values || typeof data.values !== 'object' || Array.isArray(data.values) || !Array.isArray(data.items) || data.items.length > 100) throw new HttpError(400, 'Некоректний вміст розділу');
  const raw = data.values as Record<string, unknown>;
  const values: Record<string, string> = {};
  for (const field of definition.fields) {
    const value = raw[field.key];
    text(value, field.label, field.type === 'textarea' ? 10000 : 2000);
    if (field.type === 'url' && value && !/^https:\/\//i.test(String(value))) throw new HttpError(400, 'Посилання має починатися з https://');
    if (field.type === 'image' && value) image(value);
    values[field.key] = value as string;
  }
  if (sectionId === 'contacts' && !/^\+?[\d\s()\-]{9,25}$/.test(values.phone)) throw new HttpError(400, 'Перевірте номер телефону');
  const items = data.items.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new HttpError(400, 'Некоректний запис');
    const record = item as Record<string, unknown>;
    const entry: Record<string, string> = { id: id(record.id) };
    for (const field of definition.itemFields) entry[field.key] = text(record[field.key], field.label, 10000, 1);
    return entry;
  });
  return { visible: bool(data.visible), values, items };
}
