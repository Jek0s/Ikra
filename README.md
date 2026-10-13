**Пошаговое подключение реальной админки: `ПОДКЛЮЧЕНИЕ-SUPABASE.md`.**

# IKRA DeLuxe — React + TypeScript storefront

Премиальный адаптивный магазин (украинский интерфейс): светлая/тёмная тема, каталог, фильтры, корзина, оформление заказа, `/admin` для изменения товаров и заказов.

## Запуск в IntelliJ IDEA

Требуется Node.js 20.19+ или 22.12+.

```bash
npm install
npm run dev
```

Открыть `http://localhost:5173` (магазин) и `http://localhost:5173/admin` (админ-панель).

**Важно:** без Supabase это **демо-режим**: продукты/заказы хранятся в `localStorage` конкретного браузера. Демо-админка не защищена логином и не синхронизирует данные между пользователями. Не использовать этот режим для реальных продаж.

## Подключение Supabase для настоящего магазина

1. Создать проект в [supabase.com](https://supabase.com). В SQL Editor выполнить **`supabase/schema.sql`**.
2. В `Authentication → Users` создать владельца с email и паролем. Скопировать его UUID и **отдельно** выполнить в SQL Editor:

```sql
insert into public.admin_users(user_id) values ('UUID-АДМИНИСТРАТОРА');
```

3. В `Project Settings → API` взять Project URL и **publishable/anon key**. Создать `.env.local` в корне:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Нельзя помещать `service_role` или secret API key в `VITE_*`! Эти переменные видны посетителям сайта.

4. Выполнить `npm run dev`. Зайти на `/admin`, авторизоваться созданным аккаунтом. Через «Додати товар» добавить реальные товары и фото. В облачном режиме исходные демонстрационные товары **не добавляются автоматически**. Изменения сохраняются в Supabase и доступны всем посетителям.
5. **Перед запуском продаж:** добавить privacy policy, достоверные данные продавца и способы связи, проверить доставку/возвраты и оформить защиту от спама/ботов (например, rate-limit на сервере/Edge Function и CAPTCHA). SQL проверяет права админов и цены товаров, но не заменяет антиспам.

## Хостинг

```bash
npm run build
```

Загрузить содержимое `dist/` на статический хостинг. Настроить SPA fallback, чтобы адрес `/admin` направлялся на `index.html` (на Apache/Hostinger см. `public/.htaccess`). Supabase будет работать отдельно в облаке; сервер Node.js для React не нужен.

## Структура

- `src/pages/HomePage.tsx` и `HomePage.css` — витрина/каталог
- `src/pages/AdminPage.tsx` и `AdminPage.css` — панель управления
- `src/components/` — Header, ProductCard, CartDrawer и их CSS
- `src/context/ShopContext.tsx` — тема, каталог и корзина
- `src/lib/store.ts` — API / демо-хранилище
- `src/lib/supabase.ts` — облачный клиент
- `src/styles/global.css` — переменные светлой и тёмной темы
- `public/products/` — демонстрационные SVG-иллюстрации, заменить на реальные фотографии
- `supabase/schema.sql` — таблицы, RLS, заказ и Storage

## Ограничения

В проекте нет оплаты картой, оплаты онлайн или автоматической интеграции с перевозчиком — заказ создаётся и показывается администратору. Демо-цены, названия и иллюстрации — тестовые. Для коммерческого запуска нужен настоящий контент. Не выдавайте демо-заказы за реальные.


## Фінальне оновлення (реальні фото)
- Фотографії товарів: `public/products/{keta,coho,salmon,paddlefish,pike}.webp`.
- Баночка бренду в FAQ, featured та Instagram: `public/products/brand-jar.webp`.
- Логотип і анімація hero не змінювались.
- Всі ціни/ваги/опис товарів зараз **демонстраційні** — змінюються у панелі `/admin`.
- Instagram: https://www.instagram.com/_ikra_deluxe_ua/
- Локальна адмінка без Supabase — це лише деморежим, не захищена. Перед публікацією налаштуйте Supabase Auth, RLS, адміністраторські ролі і перевірте створення замовлень.
- Для перевірки: `npm install`, `npm run build`, `npm run dev`.
