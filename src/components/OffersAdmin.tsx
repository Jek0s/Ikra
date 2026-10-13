import { useState } from 'react';
import { Gift, ImagePlus, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import type { OfferBundle } from '../data/offers';
import { deleteOffer, saveOffer } from '../lib/offers';
import { uploadProductImage } from '../lib/store';
import { cloudMode } from '../lib/supabase';
import '../pages/AdminPage.css';

const blankOffer = (): OfferBundle => ({
  id: crypto.randomUUID(), title: '', promo: '1+1=3', description: '',
  image: '/offers/bundle-1.png', weight: '1,5 кг', price: 0,
  oldPrice: 0, items: [], note: '3 баночки по 500 г', active: true,
});

export default function OffersAdmin() {
  const { offers, reload } = useShop();
  const [editor, setEditor] = useState<OfferBundle | null>(null);
  const [itemsText, setItemsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const edit = (offer: OfferBundle) => {
    setEditor({ ...offer });
    setItemsText(offer.items.join('\n'));
    setError('');
    setNotice('');
  };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    if (!editor.title.trim() || editor.price <= 0 || !Number.isFinite(editor.price)) {
      setError('Вкажіть назву набору та коректну ціну.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      saveOffer({ ...editor, title: editor.title.trim(), items: itemsText.split('\n').map(s => s.trim()).filter(Boolean) });
      await reload();
      setEditor(null);
      setNotice('Акцію збережено. Зміни вже видно в каруселі магазину.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не вдалося зберегти акцію');
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: File) => {
    if (!editor) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Використайте JPG, PNG або WEBP до 5 МБ.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      let url: string;
      if (cloudMode) {
        url = await uploadProductImage(file);
      } else {
        const bmp = await createImageBitmap(file);
        const limit = 1000;
        const scale = Math.min(1, limit / Math.max(bmp.width, bmp.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bmp.width * scale));
        canvas.height = Math.max(1, Math.round(bmp.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Не вдалося обробити зображення');
        context.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        bmp.close();
        url = canvas.toDataURL('image/webp', 0.75);
      }
      setEditor(current => current ? { ...current, image: url } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити фото');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Видалити цей акційний набір?')) return;
    deleteOffer(id);
    await reload();
    setNotice('Акцію видалено.');
  };

  return <>
    <div className="admin-panel">
      <div className="panel-head">
        <div><h2>Акційні набори <span className="light-number">({offers.length})</span></h2><p>Редагуйте склад набору, фотографії, описи, ціни та публікацію.</p></div>
        <button className="btn-primary" onClick={() => edit(blankOffer())}><Plus size={18}/> Додати акцію</button>
      </div>
      {notice && <p className="admin-alert"><Gift size={17}/>{notice}</p>}
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>НАБІР</th><th>АКЦІЯ</th><th>ЦІНА</th><th>СТАТУС</th><th>ДІЇ</th></tr></thead><tbody>
        {offers.map(offer => <tr key={offer.id}>
          <td><div className="table-product"><img src={offer.image} alt=""/><div><b>{offer.title}</b><small>{offer.weight}</small></div></div></td>
          <td>{offer.promo}</td><td><b>{offer.price.toLocaleString('uk-UA')} ₴</b></td>
          <td><span className={`status-pill ${offer.active?'active':'inactive'}`}>{offer.active?'На сайті':'Приховано'}</span></td>
          <td><div className="table-buttons"><button aria-label="Редагувати акцію" onClick={()=>edit(offer)}><Pencil size={17}/></button><button aria-label="Видалити акцію" onClick={()=>void remove(offer.id)}><Trash2 size={17}/></button></div></td>
        </tr>)}
      </tbody></table></div>
    </div>
    {editor && <div className="admin-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setEditor(null);}}>
      <form className="admin-modal" onSubmit={e=>void save(e)}>
        <div className="modal-head"><div><span className="eyebrow">РЕДАКТОР АКЦІЙ</span><h2>{offers.some(o=>o.id===editor.id)?'Редагувати акцію':'Нова акція'}</h2></div><button type="button" className="icon-btn" disabled={busy} onClick={()=>setEditor(null)}><X/></button></div>
        <div className="admin-form">
          <label className="image-upload"><img src={editor.image} alt="Зображення акції"/><span><ImagePlus size={20}/> Завантажити фото <small>JPG, PNG, WEBP · до 5 МБ</small></span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);}}/></label>
          <label>Назва набору<input required value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})}/></label>
          <div className="form-two"><label>Формула акції<input value={editor.promo} onChange={e=>setEditor({...editor,promo:e.target.value})} placeholder="1+1=3 / 3=5"/></label><label>Вага<input value={editor.weight} onChange={e=>setEditor({...editor,weight:e.target.value})}/></label></div>
          <div className="form-two"><label>Ціна, ₴<input required type="number" min="1" step="1" value={editor.price} onChange={e=>setEditor({...editor,price:Number(e.target.value)})}/></label><label>Стара ціна, ₴<input type="number" min="0" value={editor.oldPrice} onChange={e=>setEditor({...editor,oldPrice:Number(e.target.value)})}/></label></div>
          <label>Опис акції<textarea rows={3} value={editor.description} onChange={e=>setEditor({...editor,description:e.target.value})}/></label>
          <label>Склад набору (один товар на рядок)<textarea rows={4} value={itemsText} onChange={e=>setItemsText(e.target.value)} placeholder={'Кета преміум — 500 г\nГорбуша — 500 г\nВеслонос — 500 г'}/></label>
          <label>Коротка примітка<input value={editor.note} onChange={e=>setEditor({...editor,note:e.target.value})} placeholder="3 баночки по 500 г"/></label>
          <div className="check-row"><label><input type="checkbox" checked={editor.active} onChange={e=>setEditor({...editor,active:e.target.checked})}/> Показувати на сайті</label></div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="modal-actions"><button type="button" className="btn-secondary" disabled={busy} onClick={()=>setEditor(null)}>Скасувати</button><button type="submit" className="btn-primary" disabled={busy}><Save size={17}/>{busy?'Збереження...':'Зберегти акцію'}</button></div>
      </form>
    </div>}
  </>;
}
