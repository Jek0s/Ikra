import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, Check, ImagePlus, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useSiteContent } from '../context/SiteContentContext';
import { contentDefinitions } from '../lib/site-content';
import type { ContentDefinition, ContentField, ContentSection } from '../lib/site-content';
import { uploadProductImage } from '../lib/store';
import { cloudMode } from '../lib/backend';
import './SiteContentAdmin.css';

type Area = 'sections' | 'contacts' | 'settings';

export default function SiteContentAdmin({ area = 'sections' }: { area?: Area }) {
  const { content, save, ready, error: loadError, reload } = useSiteContent();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const definition = contentDefinitions.find(item => item.id === (area === 'contacts' ? 'contacts' : area === 'settings' ? 'seo' : selected));
  const definitions = contentDefinitions.filter(item => !['contacts', 'seo'].includes(item.id));
  const filtered = definitions.filter(item => `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase()));

  if (definition) return <SectionEditor key={definition.id} definition={definition} initial={content[definition.id]} disabled={!ready || Boolean(loadError)}
    loadError={loadError} onReload={() => void reload()} onClose={area === 'sections' ? () => setSelected(null) : undefined}
    onSave={async section => { await save(definition.id, section); }} />;

  return <>
    <div className="admin-panel content-intro">
      <div className="panel-head"><div><h2>Усі розділи сайту</h2><p>Оберіть блок → змініть текст або фото → збережіть.</p></div></div>
      <p className="content-mode">{cloudMode ? 'Збережені зміни доступні всім відвідувачам. Відкрита сторінка оновиться протягом 30 секунд.' : 'Локальний режим: зміни зберігаються лише в цьому браузері. Після підключення бази їх бачитимуть усі відвідувачі.'}</p>
      {loadError && <p className="form-error" role="alert">{loadError} <button onClick={() => void reload()}>Повторити</button></p>}
      <label className="content-search"><Search size={18} /><input aria-label="Знайти розділ" placeholder="Знайти розділ…" value={query} onChange={event => setQuery(event.target.value)} /></label>
    </div>
    <div className="content-section-grid">{filtered.map(item => <button key={item.id} className="content-section-card" onClick={() => setSelected(item.id)}>
      <span className="content-card-top"><span className={`status-pill ${content[item.id].visible ? 'active' : 'inactive'}`}>{content[item.id].visible ? 'На сайті' : 'Приховано'}</span><ArrowUpRight size={18} /></span>
      <strong>{item.title}</strong><span>{item.description}</span><small>Редагувати →</small>
    </button>)}</div>
    {!filtered.length && <p className="admin-empty">Розділів не знайдено. Спробуйте іншу назву.</p>}
  </>;
}

function SectionEditor({ definition, initial, disabled, loadError, onReload, onClose, onSave }: {
  definition: ContentDefinition; initial: ContentSection; disabled: boolean; loadError: string; onReload: () => void;
  onClose?: () => void; onSave: (section: ContentSection) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ContentSection>(() => structuredClone(initial));
  const baseline = useRef(JSON.stringify(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dirty = JSON.stringify(draft) !== baseline.current;
  // Do not replace unsaved edits when a background refresh arrives.
  useEffect(() => {
    if (!dirty) { setDraft(structuredClone(initial)); baseline.current = JSON.stringify(initial); }
  }, [initial, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    const guardNavigation = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('.side-nav button, [aria-label="Вийти з адмінки"]')) return;
      if (!window.confirm('Є незбережені зміни. Вийти без збереження?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', prevent);
    document.addEventListener('click', guardNavigation, true);
    return () => { window.removeEventListener('beforeunload', prevent); document.removeEventListener('click', guardNavigation, true); };
  }, [dirty]);
  const setValue = (key: string, value: string) => { setNotice(''); setDraft(current => ({ ...current, values: { ...current.values, [key]: value } })); };
  const upload = async (key: string, file?: File) => {
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Оберіть JPG, PNG або WEBP до 5 МБ'); return; }
    setBusy(true);
    try { setValue(key, await uploadProductImage(file)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити фото'); }
    finally { setBusy(false); }
  };
  const move = (index: number, step: number) => setDraft(current => {
    const items = [...current.items];
    [items[index], items[index + step]] = [items[index + step], items[index]];
    return { ...current, items };
  });
  const close = () => { if (!dirty || window.confirm('Є незбережені зміни. Вийти без збереження?')) onClose?.(); };
  const renderField = (field: ContentField) => <div className="content-field" key={field.key}>
    <label htmlFor={`content-${definition.id}-${field.key}`}>
    {field.label}</label>
    {field.type === 'image' ? <div className="content-image-field">
      <img src={draft.values[field.key]} alt="Попередній перегляд" />
      <input id={`content-${definition.id}-${field.key}`} aria-label={`${field.label}: посилання`} value={draft.values[field.key]} onChange={event => setValue(field.key, event.target.value)} placeholder="/products/photo.webp або https://…" />
      <label className="btn-secondary"><ImagePlus size={16} /> Завантажити фото<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => { void upload(field.key, event.target.files?.[0]); event.target.value = ''; }} /></label><small>JPG, PNG, WEBP · до 5 МБ</small>
    </div> : field.type === 'textarea' ? <textarea id={`content-${definition.id}-${field.key}`} rows={3} value={draft.values[field.key]} onChange={event => setValue(field.key, event.target.value)} />
      : <input id={`content-${definition.id}-${field.key}`} type={field.type === 'url' ? 'url' : field.type === 'tel' ? 'tel' : 'text'} value={draft.values[field.key]} onChange={event => setValue(field.key, event.target.value)} placeholder={field.type === 'url' ? 'https://…' : undefined} />}
  </div>;

  return <form className="admin-panel content-editor" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await onSave(draft); baseline.current = JSON.stringify(draft); setNotice(cloudMode ? 'Збережено. Зміни опубліковано на сайті.' : 'Збережено в цьому браузері.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося зберегти'); }
    finally { setBusy(false); }
  }}>
    <div className="panel-head"><div>{onClose && <button type="button" className="content-back" disabled={busy} onClick={close}>← Усі розділи</button>}<h2>{definition.title}</h2><p>{definition.description}</p></div></div>
    <p className="content-mode">{cloudMode ? 'Зміни з’являться на сайті після збереження.' : 'Зміни зберігаються лише в цьому браузері. Спільна публікація стане доступною після підключення бази.'}</p>
    {loadError && <p className="form-error" role="alert">{loadError} <button type="button" onClick={onReload}>Повторити</button></p>}
    <fieldset disabled={busy || disabled}>
      {!['seo', 'header'].includes(definition.id) && <label className="content-visible"><input type="checkbox" checked={draft.visible} onChange={event => setDraft({ ...draft, visible: event.target.checked })} /> {definition.id === 'contacts' ? 'Показувати плаваючу кнопку зв’язку' : 'Показувати цей блок на сайті'}</label>}
      <div className="admin-form content-fields">{definition.fields.filter(field => !field.advanced).map(renderField)}</div>
      {definition.fields.some(field => field.advanced) && <details className="content-additional"><summary>Додаткові підписи та описи фото</summary><div className="admin-form content-fields">{definition.fields.filter(field => field.advanced).map(renderField)}</div></details>}
      {definition.itemFields.length > 0 && <div className="content-items">
        <div className="panel-head"><h3>Записи ({draft.items.length})</h3><button type="button" className="btn-secondary" onClick={() => setDraft({ ...draft, items: [...draft.items, { id: crypto.randomUUID(), ...Object.fromEntries(definition.itemFields.map(field => [field.key, ''])) }] })}><Plus size={17} /> Додати запис</button></div>
        {!draft.items.length && <p className="content-mode">Записів немає. Додайте перший або приховайте блок.</p>}
        {draft.items.map((item, index) => <div className="content-item" key={item.id}>
          <div className="content-item-head"><strong>Запис {index + 1}</strong><div>
            <button type="button" className="icon-btn" disabled={index === 0} aria-label="Перемістити вгору" onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
            <button type="button" className="icon-btn" disabled={index === draft.items.length - 1} aria-label="Перемістити вниз" onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
            <button type="button" className="icon-btn" aria-label="Видалити запис" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, i) => i !== index) })}><Trash2 size={16} /></button>
          </div></div>
          <div className="admin-form content-fields">{definition.itemFields.map(field => <label key={field.key}>{field.label}{field.type === 'textarea'
            ? <textarea required rows={3} value={item[field.key]} onChange={event => setDraft({ ...draft, items: draft.items.map((entry, i) => i === index ? { ...entry, [field.key]: event.target.value } : entry) })} />
            : <input required value={item[field.key]} onChange={event => setDraft({ ...draft, items: draft.items.map((entry, i) => i === index ? { ...entry, [field.key]: event.target.value } : entry) })} />}</label>)}</div>
        </div>)}
      </div>}
    </fieldset>
    <div className="content-save">
      <div>{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="content-success" role="status"><Check size={17} />{notice}</p>}{dirty && !notice && <span>Є незбережені зміни</span>}</div>
      <div>{onClose && <button type="button" className="btn-secondary" disabled={busy} onClick={close}><X size={16} /> Закрити</button>}<button type="submit" className="btn-primary" disabled={busy || disabled || !dirty}><Save size={17} />{busy ? 'Збереження…' : 'Зберегти зміни'}</button></div>
    </div>
  </form>;
}
