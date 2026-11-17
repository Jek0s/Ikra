import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
 Box,
 Check,
 ClipboardList,
 Gift,
 ImagePlus,
 LayoutDashboard,
 LayoutTemplate,
 Phone,
 Settings,
 Loader2,
 LogOut,
 Moon,
 Package,
 Pencil,
 Plus,
 Save,
 Sun,
 Trash2,
 X,
} from 'lucide-react';

import { useShop } from '../context/ShopContext';
import { useSiteContent } from '../context/SiteContentContext';
import { AUTH_EVENT, cloudMode, getBackendStatus, getSession, loginAdmin, logoutAdmin } from '../lib/backend';
import type { BackendStatus } from '../lib/backend';
import {
 deleteProduct,
 getOrders,
 retryOrderTelegram,
 saveProduct,
 updateOrderStatus,
 uploadProductImage,
} from '../lib/store';
import type { Category, Order, OrderStatus, Product } from '../types';
import OffersAdmin from '../components/OffersAdmin';
import SiteContentAdmin from '../components/SiteContentAdmin';
import './AdminPage.css';

type Tab = 'overview' | 'products' | 'offers' | 'orders' | 'sections' | 'contacts' | 'settings';

const orderStatuses: { value: OrderStatus; label: string }[] = [
 { value: 'new', label: 'Новий' },
 { value: 'processing', label: 'В обробці' },
 { value: 'shipped', label: 'Відправлено' },
 { value: 'done', label: 'Завершено' },
 { value: 'cancelled', label: 'Скасовано' },
];

function createEmptyProduct(): Product {
 return {
  id: crypto.randomUUID(),
  name: '',
  subtitle: '',
  category: 'red',
  price: 0,
  old_price: null,
  weight: '500 г',
  image: '/products/brand-jar.webp',
  description:
      'Консистенція: \nРозмір: \nКолір: \nТара: Скляна банка',
  badge: null,
  active: true,
  featured: false,
 };
}

function categoryLabel(category: Category): string {
 switch (category) {
  case 'red':
   return 'Червона';
  case 'black':
   return 'Чорна';
  case 'other':
   return 'Щуча / інша';
  case 'sets':
   return 'Набори';
 }
}

export default function AdminPage() {
 const { products, reload, theme, toggleTheme } = useShop();
 const { text } = useSiteContent();

 const [tab, setTab] = useState<Tab>('overview');
 const [editor, setEditor] = useState<Product | null>(null);
 const [orders, setOrders] = useState<Order[]>([]);
 const [orderPage, setOrderPage] = useState(0);
 const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
 const [adminLogin, setAdminLogin] = useState('');
 const [password, setPassword] = useState('');
 const [authorized, setAuthorized] = useState(false);
 const [authReady, setAuthReady] = useState(false);
 const [isAdmin, setIsAdmin] = useState(false);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [message, setMessage] = useState('');

 const catalogProducts = products.filter(
     (product) => !product.id.startsWith('offer:'),
 );

 const activeProducts = catalogProducts.filter((product) => product.active);
 const pageRevenue = orders
     .filter((order) => order.status !== 'cancelled')
     .reduce((total, order) => total + order.total, 0);

 const revenue = cloudMode ? backendStatus?.orderTotal ?? 0 : pageRevenue;
 const orderCount = cloudMode ? backendStatus?.orderCount ?? orders.length : orders.length;

 useEffect(() => {
  let mounted = true;
  const check = async () => {
   try {
    const session = await getSession();
    if (mounted) { setAuthorized(session.authorized); setIsAdmin(session.authorized); if (!session.configured) setError('Вхід ще не налаштовано. Додайте секрети адміністратора за інструкцією Cloudflare.'); }
   } catch (reason) { if (mounted) { setAuthorized(false); setIsAdmin(false); setError(reason instanceof Error ? reason.message : 'Помилка підключення'); } }
   finally { if (mounted) setAuthReady(true); }
  };
  void check();
  window.addEventListener(AUTH_EVENT, check);
  window.addEventListener('focus', check);
  return () => { mounted = false; window.removeEventListener(AUTH_EVENT, check); window.removeEventListener('focus', check); };
 }, []);

 useEffect(() => {
  if (!authorized || !isAdmin) return;
  let cancelled = false;
  const refresh = async () => {
   try {
    const [nextOrders, status] = await Promise.all([getOrders(orderPage), cloudMode ? getBackendStatus() : Promise.resolve(null)]);
    if (!cancelled) { setOrders(nextOrders); setBackendStatus(status); }
   } catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити замовлення'); }
  };
  void refresh();
  const timer = window.setInterval(() => { if (!document.hidden && (tab === 'orders' || tab === 'overview')) void refresh(); }, 30000);
  return () => { cancelled = true; window.clearInterval(timer); };
 }, [authorized, isAdmin, orderPage, tab]);

 const refreshOrders = async (): Promise<void> => {
  try {
   const [nextOrders, status] = await Promise.all([getOrders(orderPage), cloudMode ? getBackendStatus() : Promise.resolve(null)]);
   setOrders(nextOrders); setBackendStatus(status);
  } catch (reason) { setError(reason instanceof Error ? reason.message : 'Помилка завантаження замовлень'); }
 };
 const login = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
  event.preventDefault(); setBusy(true); setError('');
  try { await loginAdmin(adminLogin.trim(), password); setPassword(''); setAuthorized(true); setIsAdmin(true); await reload(); }
  catch (reason) { setError(reason instanceof Error ? reason.message : 'Помилка входу'); }
  finally { setBusy(false); }
 };
 const logout = async (): Promise<void> => {
  try { await logoutAdmin(); setAuthorized(false); setIsAdmin(false); setOrders([]); setBackendStatus(null); }
  catch (reason) { setError(reason instanceof Error ? reason.message : 'Помилка виходу'); }
 };

 const openNewProduct = (): void => {
  setError('');
  setMessage('');
  setEditor(createEmptyProduct());
 };

 const persist = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
  event.preventDefault();
  if (!editor) return;

  if (!editor.name.trim() || !Number.isFinite(editor.price) || editor.price <= 0) {
   setError('Вкажіть назву та ціну більше нуля');
   return;
  }

  setBusy(true);
  setError('');

  try {
   await saveProduct({ ...editor, name: editor.name.trim() });
   await reload();
   setEditor(null);
   setMessage('Товар збережено');
  } catch (reason) {
   setError(reason instanceof Error ? reason.message : 'Помилка збереження');
  } finally {
   setBusy(false);
  }
 };

 const upload = async (file: File): Promise<void> => {
  if (!editor) return;

  if (!file.type.startsWith('image/')) {
   setError('Завантажте зображення');
   return;
  }

  if (file.size > 5 * 1024 * 1024) {
   setError('Максимальний розмір файлу — 5 МБ');
   return;
  }

  setBusy(true);
  setError('');

  try {
   const image = await uploadProductImage(file);
   setEditor((previous) => (previous ? { ...previous, image } : previous));
  } catch (reason) {
   setError(
       reason instanceof Error ? reason.message : 'Не вдалося завантажити фото',
   );
  } finally {
   setBusy(false);
  }
 };

 const remove = async (id: string): Promise<void> => {
  if (!window.confirm('Видалити товар без можливості відновлення?')) return;

  setError('');

  try {
   await deleteProduct(id);
   await reload();
   setMessage('Товар видалено');
  } catch (reason) {
   setError(reason instanceof Error ? reason.message : 'Помилка видалення');
  }
 };

 const updateStatus = async (
     id: string,
     status: OrderStatus,
 ): Promise<void> => {
  try {
   await updateOrderStatus(id, status);
   await refreshOrders();
  } catch (reason) {
   setError(reason instanceof Error ? reason.message : 'Не вдалося змінити статус');
  }
 };

 if (!authReady) {
  return (
      <div className="admin-centered">
       <Loader2 className="spin" />
       Перевірка доступу...
      </div>
  );
 }


 if (!authorized) {
  return (
      <div className="admin-auth-page">
       <form className="admin-login" onSubmit={(event) => void login(event)}>
        <div className="admin-login-logo">
         <img
             src="/ikra-deluxe-logo.png"
             alt="IKRA DeLuxe"
             style={{ width: 82, height: 82, objectFit: 'contain' }}
         />
        </div>
        <span className="eyebrow">IKRA DeLuxe CONTROL PANEL</span>
        <h1>Вітаємо знову.</h1>
        <p>Увійдіть до панелі керування магазином.</p>
        <label>
         Логін
         <input
             type="text"
             name="username"
             autoComplete="username"
             maxLength={254}
             required
             value={adminLogin}
             onChange={(event) => setAdminLogin(event.target.value)}
             placeholder="Ваш логін"
         />
        </label>
        <label>
         Пароль
         <input
             type="password"
             name="password"
             autoComplete="current-password"
             required
             value={password}
             onChange={(event) => setPassword(event.target.value)}
         />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn-primary" disabled={busy}>
         {busy ? 'Вхід...' : 'Увійти в панель →'}
        </button>
       </form>
      </div>
  );
 }

 if (!isAdmin) {
  return (
      <div className="admin-centered">
       <h2>Немає прав адміністратора</h2>
       <p>Увійдіть з логіном та паролем власника магазину.</p>
       <button className="btn-primary" onClick={() => void logout()}>
        Вийти
       </button>
      </div>
  );
 }

 return (
     <div className="admin-shell">
      <aside className="admin-sidebar">
       <div className="admin-logo">
        <img
            src="/ikra-deluxe-logo.png"
            alt=""
            style={{ height: 32, width: 32, objectFit: 'contain' }}
        />
        IKRA <small>ADMIN</small>
       </div>

       <div className="side-group-title">РОБОЧИЙ ПРОСТІР</div>
       <nav className="side-nav">
        <button
            className={tab === 'overview' ? 'selected' : ''}
            onClick={() => setTab('overview')}
        >
         <LayoutDashboard size={19} /> Огляд
        </button>
        <button
            className={tab === 'products' ? 'selected' : ''}
            onClick={() => setTab('products')}
        >
         <Package size={19} /> Товари <span>{catalogProducts.length}</span>
        </button>
        <button
            className={tab === 'offers' ? 'selected' : ''}
            onClick={() => setTab('offers')}
        >
         <Gift size={19} /> Акції
        </button>
        <button
            className={tab === 'orders' ? 'selected' : ''}
            onClick={() => {
             setTab('orders');
             void refreshOrders();
            }}
        >
         <ClipboardList size={19} /> Замовлення <span>{orderCount}</span>
        </button>
        <button className={tab === 'sections' ? 'selected' : ''} onClick={() => setTab('sections')}><LayoutTemplate size={19} /> Розділи сайту</button>
        <button className={tab === 'contacts' ? 'selected' : ''} onClick={() => setTab('contacts')}><Phone size={19} /> Контакти</button>
        <button className={tab === 'settings' ? 'selected' : ''} onClick={() => setTab('settings')}><Settings size={19} /> Налаштування</button>
       </nav>

      </aside>

      <div className="admin-main">
       <div className="admin-top">
        <div>
         <span className="eyebrow">IKRA DeLuxe / DASHBOARD</span>
         <h1>
          {tab === 'overview'
              ? 'Панель керування'
              : tab === 'products'
                  ? 'Каталог товарів'
                  : tab === 'offers'
                      ? 'Акційні набори'
                      : tab === 'sections' ? 'Розділи сайту' : tab === 'contacts' ? 'Контакти' : tab === 'settings' ? 'Налаштування сайту' : 'Замовлення'}
         </h1>
        </div>
        <div className="admin-top-actions">
         <button
             className="icon-btn"
             onClick={toggleTheme}
             aria-label="Змінити тему"
         >
          {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
         </button>
         <img className="admin-avatar" src={text('seo', 'logo') || '/ikra-deluxe-logo.png'} alt="Логотип IKRA DeLuxe" width={43} height={43} />
         <button className="icon-btn" onClick={() => void logout()} aria-label="Вийти з адмінки" title="Вийти"><LogOut size={19} /></button>
        </div>
       </div>

       {!cloudMode && <p className="admin-storage-note">Режим попереднього перегляду: зміни видно лише в цьому браузері.</p>}

       {message && (
           <div className="admin-alert">
            <Check size={17} />
            {message}
            <button onClick={() => setMessage('')} aria-label="Закрити повідомлення">
             <X size={15} />
            </button>
           </div>
       )}

       {error && !editor && (
           <div className="admin-error">
            {error}
            <button onClick={() => setError('')} aria-label="Закрити помилку">
             ×
            </button>
           </div>
       )}

       {tab === 'overview' && (
           <>
            <div className="stats-grid">
             <div className="stat">
              <div className="stat-top">
               Товарів у каталозі <Package size={19} />
              </div>
              <strong>{catalogProducts.length}</strong>
              <small>{activeProducts.length} активних позицій</small>
             </div>
             <div className="stat">
              <div className="stat-top">
               Всього замовлень <ClipboardList size={19} />
              </div>
              <strong>{orderCount}</strong>
              <small>Отримано через сайт</small>
             </div>
             <div className="stat">
              <div className="stat-top">
               Сума замовлень <Box size={19} />
              </div>
              <strong>{revenue.toLocaleString('uk-UA')} ₴</strong>
              <small>Без скасованих · не оплачена виручка</small>
             </div>
            </div>

            <div className="admin-panel">
             <div className="panel-head">
              <div>
               <h2>Швидкі дії</h2>
               <p>Все для керування магазином в одному місці.</p>
              </div>
             </div>
             <div className="quick-actions">
              <button onClick={() => setTab('sections')}><LayoutTemplate /> Змінити розділи сайту</button>
              <button onClick={() => setTab('contacts')}><Phone /> Оновити контакти</button>
              <button onClick={openNewProduct}>
               <Plus /> Додати товар
              </button>
              <button onClick={() => setTab('products')}>
               <Pencil /> Редагувати каталог
              </button>
              <button onClick={() => setTab('offers')}>
               <Gift /> Керувати акціями
              </button>
              <button
                  onClick={() => {
                   setTab('orders');
                   void refreshOrders();
                  }}
              >
               <ClipboardList /> Переглянути замовлення
              </button>
             </div>
            </div>
           </>
       )}

       {tab === 'products' && (
           <div className="admin-panel">
            <div className="panel-head">
             <div>
              <h2>
               Товари <span className="light-number">({catalogProducts.length})</span>
              </h2>
              <p>Оновлюйте ціни, описи, фото та наявність.</p>
             </div>
             <button className="btn-primary" onClick={openNewProduct}>
              <Plus size={18} /> Додати товар
             </button>
            </div>

            <div className="admin-table-wrap">
             <table className="admin-table">
              <thead>
              <tr>
               <th>ТОВАР</th>
               <th>ЦІНА</th>
               <th>КАТЕГОРІЯ</th>
               <th>СТАТУС</th>
               <th>ДІЇ</th>
              </tr>
              </thead>
              <tbody>
              {catalogProducts.map((product) => (
                  <tr key={product.id}>
                   <td>
                    <div className="table-product">
                     <img src={product.image} alt="" />
                     <div>
                      <b>{product.name}</b>
                      <small>{product.weight}</small>
                     </div>
                    </div>
                   </td>
                   <td>
                    <b>{product.price.toLocaleString('uk-UA')} ₴</b>
                   </td>
                   <td>{categoryLabel(product.category)}</td>
                   <td>
                        <span
                            className={`status-pill ${product.active ? 'active' : 'inactive'}`}
                        >
                          {product.active ? 'На сайті' : 'Приховано'}
                        </span>
                   </td>
                   <td>
                    <div className="table-buttons">
                     <button
                         aria-label={`Редагувати ${product.name}`}
                         onClick={() => {
                          setError('');
                          setEditor({ ...product });
                         }}
                     >
                      <Pencil size={17} />
                     </button>
                     <button
                         aria-label={`Видалити ${product.name}`}
                         onClick={() => void remove(product.id)}
                     >
                      <Trash2 size={17} />
                     </button>
                    </div>
                   </td>
                  </tr>
              ))}
              </tbody>
             </table>
            </div>
           </div>
       )}

       {tab === 'offers' && <OffersAdmin />}
       {tab === 'sections' && <SiteContentAdmin key="sections" />}
       {tab === 'contacts' && <SiteContentAdmin key="contacts" area="contacts" />}
       {tab === 'settings' && <SiteContentAdmin key="settings" area="settings" />}
       {tab === 'settings' && cloudMode && backendStatus && <div className="admin-panel">
        <h2>Сповіщення та фотографії</h2>
        <p>{backendStatus.telegram ? 'Сповіщення про замовлення в Telegram увімкнено.' : 'Сповіщення в Telegram вимкнено. Усі замовлення доступні у вкладці «Замовлення».'}</p>
        {backendStatus.telegram && backendStatus.pendingNotifications > 0 && <p>Очікують надсилання в Telegram: {backendStatus.pendingNotifications}.</p>}
        <p>{backendStatus.images ? 'Можна завантажувати фотографії з комп’ютера або вказувати посилання.' : 'Завантаження фотографій з комп’ютера поки недоступне. Щоб змінити фото, вставте посилання на зображення в редакторі.'}</p>
       </div>}

       {tab === 'orders' && (
           <div className="admin-panel">
            <div className="panel-head">
             <div>
              <h2>
               Замовлення <span className="light-number">({orderCount})</span>
              </h2>
              <p>Контакти клієнтів, склад замовлень та статус виконання.</p>
             </div>
             <button className="btn-secondary" onClick={() => void refreshOrders()}>
              Оновити
             </button>
            </div>

            {orders.length === 0 ? (
                <div className="admin-empty">
                 <ClipboardList size={36} />
                 <h3>Замовлень поки немає</h3>
                 <p>Як тільки покупець оформить замовлення, воно з'явиться тут.</p>
                </div>
            ) : (
                <div className="orders-list">
                 {orders.map((order) => (
                     <div className="order" key={order.id}>
                      <div className="order-header">
                       <div>
                        <b>#{order.id.slice(0, 8)}</b>
                        <small>{new Date(order.created_at).toLocaleString('uk-UA')}</small>
                       </div>
                       <strong>{order.total.toLocaleString('uk-UA')} ₴</strong>
                      </div>
                      <p>
                       <b>{order.customer_name}</b> ·{' '}
                       <a href={`tel:${order.customer_phone}`}>
                        {order.customer_phone}
                       </a>{' '}
                       · {order.city}
                      </p>
                      <div className="order-items">
                       {order.items.map((item, index) => (
                           <span key={`${item.product_id}-${index}`}>
                          {item.name} × {item.quantity}
                        </span>
                       ))}
                      </div>
                      {order.delivery_address && <p className="order-comment">Нова пошта: {order.delivery_address}</p>}
                      <p className="order-comment">Джерело: {order.source || 'direct'}{order.utm_medium ? ` · ${order.utm_medium}` : ''}{order.utm_campaign ? ` · ${order.utm_campaign}` : ''} · IP: {order.customer_ip || 'не визначено'}</p>
                      {cloudMode && <p className="order-comment">Telegram: {order.telegram_status === 'sent' ? 'надіслано' : order.telegram_status === 'not_configured' ? 'ще не підключено' : order.telegram_status === 'failed' ? 'не доставлено' : 'очікує відправки'}
                       {backendStatus?.telegram && order.telegram_status !== 'sent' && <button className="btn-secondary" onClick={() => { void retryOrderTelegram(order.id).then(async () => { setError(''); await refreshOrders(); }).catch(async reason => { setError(reason instanceof Error ? reason.message : 'Помилка відправки'); await refreshOrders(); }); }}>Повторити</button>}
                      </p>}
                      {cloudMode && order.telegram_error && <p className="order-comment" role="status">{order.telegram_error}</p>}
                      {order.comment && (
                          <p className="order-comment">Коментар: {order.comment}</p>
                      )}
                      <label>
                       Статус
                       <select
                           value={order.status}
                           onChange={(event) =>
                               void updateStatus(
                                   order.id,
                                   event.target.value as OrderStatus,
                               )
                           }
                       >
                        {orderStatuses.map((status) => (
                            <option key={status.value} value={status.value}>
                             {status.label}
                            </option>
                        ))}
                       </select>
                      </label>
                     </div>
                 ))}
                </div>
            )}
           </div>
       )}
       {tab === 'orders' && <div className="content-save">
        <button className="btn-secondary" disabled={orderPage === 0} onClick={() => setOrderPage(page => page - 1)}>← Назад</button>
        <span>Сторінка {orderPage + 1} · до 100 замовлень</span>
        <button className="btn-secondary" disabled={orders.length < 100} onClick={() => setOrderPage(page => page + 1)}>Далі →</button>
       </div>}
      </div>

      {editor && (
          <div
              className="admin-modal-backdrop"
              onMouseDown={(event) => {
               if (event.target === event.currentTarget && !busy) {
                setEditor(null);
               }
              }}
          >
           <form className="admin-modal" onSubmit={(event) => void persist(event)}>
            <div className="modal-head">
             <div>
              <span className="eyebrow">РЕДАКТОР КАТАЛОГУ</span>
              <h2>
               {products.some((product) => product.id === editor.id)
                   ? 'Редагувати товар'
                   : 'Новий товар'}
              </h2>
             </div>
             <button
                 type="button"
                 className="icon-btn"
                 onClick={() => setEditor(null)}
                 aria-label="Закрити"
             >
              <X />
             </button>
            </div>

            <div className="admin-form">
             <label className="image-upload">
              <img src={editor.image} alt="Попередній перегляд" />
              <span>
                  <ImagePlus size={20} /> Змінити фотографію
                  <small>JPG, PNG, WEBP · до 5 МБ</small>
                </span>
              <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                   const file = event.target.files?.[0];
                   if (file) void upload(file);
                  }}
              />
             </label>

             <label>
              Посилання на фотографію
              <input
                  value={editor.image}
                  placeholder="https://…"
                  onChange={(event) => setEditor({ ...editor, image: event.target.value })}
              />
             </label>

             <div className="form-two">
              <label>
               Назва товару
               <input
                   required
                   value={editor.name}
                   onChange={(event) =>
                       setEditor({ ...editor, name: event.target.value })
                   }
               />
              </label>
              <label>
               Підзаголовок
               <input
                   value={editor.subtitle}
                   onChange={(event) =>
                       setEditor({ ...editor, subtitle: event.target.value })
                   }
               />
              </label>
             </div>

             <div className="form-two">
              <label>
               Ціна, ₴
               <input
                   required
                   type="number"
                   min="1"
                   step="1"
                   value={editor.price}
                   onChange={(event) =>
                       setEditor({ ...editor, price: Number(event.target.value) })
                   }
               />
              </label>
              <label>
               Стара ціна, ₴
               <input
                   type="number"
                   min="0"
                   value={editor.old_price ?? ''}
                   onChange={(event) =>
                       setEditor({
                        ...editor,
                        old_price:
                            event.target.value === ''
                                ? null
                                : Number(event.target.value),
                       })
                   }
               />
              </label>
             </div>

             <div className="form-two">
              <label>
               Категорія
               <select
                   value={editor.category}
                   onChange={(event) =>
                       setEditor({
                        ...editor,
                        category: event.target.value as Category,
                       })
                   }
               >
                <option value="red">Червона ікра</option>
                <option value="black">Чорна ікра</option>
                <option value="sets">Подарункові набори</option>
                <option value="other">Щуча / інша ікра</option>
               </select>
              </label>
              <label>
               Вага / об'єм
               <input
                   value={editor.weight}
                   onChange={(event) =>
                       setEditor({ ...editor, weight: event.target.value })
                   }
               />
              </label>
             </div>

             <label>
              Бейдж (необов'язково)
              <input
                  value={editor.badge ?? ''}
                  onChange={(event) =>
                      setEditor({ ...editor, badge: event.target.value || null })
                  }
                  placeholder="ХІТ ПРОДАЖУ / АКЦІЯ"
              />
             </label>
             <label>
              Характеристики товару
              <textarea
                  rows={5}
                  value={editor.description}
                  onChange={(event) =>
                      setEditor({ ...editor, description: event.target.value })
                  }
              />
             </label>
             <div className="check-row">
              <label>
               <input
                   type="checkbox"
                   checked={editor.active}
                   onChange={(event) =>
                       setEditor({ ...editor, active: event.target.checked })
                   }
               />
               Опубліковано
              </label>
              <label>
               <input
                   type="checkbox"
                   checked={editor.featured}
                   onChange={(event) =>
                       setEditor({ ...editor, featured: event.target.checked })
                   }
               />
               Рекомендований
              </label>
             </div>
             {error && <p className="form-error">{error}</p>}
            </div>

            <div className="modal-actions">
             <button
                 className="btn-secondary"
                 type="button"
                 onClick={() => setEditor(null)}
             >
              Скасувати
             </button>
             <button className="btn-primary" disabled={busy} type="submit">
              <Save size={17} />
              {busy ? 'Збереження...' : 'Зберегти товар'}
             </button>
            </div>
           </form>
          </div>
      )}
     </div>
 );
}
