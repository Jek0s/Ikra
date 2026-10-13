-- Run once in Supabase SQL Editor. Create an Auth user first; then grant admin manually below.
create extension if not exists pgcrypto;
create table if not exists public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 1 and 180),
 subtitle text not null default '',
 category text not null check(category in ('red','black','sets','other')),
 price numeric(12,2) not null check(price > 0),
 old_price numeric(12,2) check(old_price is null or old_price >= 0),
 weight text not null default '',
 image text not null default '',
 description text not null default '',
 badge text,
 active boolean not null default true,
 featured boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 customer_name text not null,
 customer_phone text not null,
 city text not null,
 comment text not null default '',
 items jsonb not null,
 total numeric(12,2) not null,
 status text not null default 'new' check (status in ('new','processing','shipped','done','cancelled')),
 created_at timestamptz not null default now()
);
create or replace function public.is_shop_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_shop_admin() from public;
grant execute on function public.is_shop_admin() to authenticated, anon;
alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
drop policy if exists "admin own membership" on public.admin_users;
create policy "admin own membership" on public.admin_users for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "public active products" on public.products;
create policy "public active products" on public.products for select to anon, authenticated using (active or (select public.is_shop_admin()));
drop policy if exists "admin insert products" on public.products;
create policy "admin insert products" on public.products for insert to authenticated with check ((select public.is_shop_admin()));
drop policy if exists "admin edit products" on public.products;
create policy "admin edit products" on public.products for update to authenticated using ((select public.is_shop_admin())) with check ((select public.is_shop_admin()));
drop policy if exists "admin delete products" on public.products;
create policy "admin delete products" on public.products for delete to authenticated using ((select public.is_shop_admin()));
drop policy if exists "admin read orders" on public.orders;
create policy "admin read orders" on public.orders for select to authenticated using ((select public.is_shop_admin()));
drop policy if exists "admin update orders" on public.orders;
create policy "admin update orders" on public.orders for update to authenticated using ((select public.is_shop_admin())) with check ((select public.is_shop_admin()));
-- Public orders must be placed via controlled function: derive prices from DB, never from browser.
create or replace function public.place_order(p_name text, p_phone text, p_city text, p_comment text, p_items jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_order uuid; v_total numeric(12,2) := 0; v_lines jsonb := '[]'::jsonb;
 v_item jsonb; v_product public.products%rowtype; v_quantity int;
begin
 if char_length(btrim(coalesce(p_name,''))) not between 2 and 100
 or char_length(btrim(coalesce(p_phone,''))) not between 9 and 22
 or char_length(btrim(coalesce(p_city,''))) not between 2 and 120
 or char_length(coalesce(p_comment,'')) > 500 then raise exception 'Некоректні контактні дані'; end if;
 if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
 raise exception 'Некоректний кошик'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if (v_item->>'product_id') is null then
   -- Accept camelCase as sent by frontend.
   if (v_item->>'product_id') is null and (v_item->>'productId') is null then raise exception 'Невідомий товар'; end if;
  end if;
  if coalesce(v_item->>'quantity','') !~ '^[0-9]{1,3}$' then raise exception 'Некоректна кількість'; end if;
  v_quantity := (v_item->>'quantity')::int;
  if v_quantity < 1 or v_quantity > 50 then raise exception 'Некоректна кількість'; end if;
  select * into v_product from public.products where id = coalesce(v_item->>'product_id',v_item->>'productId')::uuid and active;
  if not found then raise exception 'Товар недоступний'; end if;
  v_total := v_total + v_product.price * v_quantity;
  v_lines := v_lines || jsonb_build_array(jsonb_build_object('product_id',v_product.id,'name',v_product.name,'price',v_product.price,'quantity',v_quantity));
 end loop;
 insert into public.orders(customer_name,customer_phone,city,comment,items,total)
 values (btrim(p_name),btrim(p_phone),btrim(p_city),coalesce(p_comment,''),v_lines,v_total)
 returning id into v_order;
 return v_order;
end;
$$;
revoke all on function public.place_order(text,text,text,text,jsonb) from public;
grant execute on function public.place_order(text,text,text,text,jsonb) to anon, authenticated;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
 on conflict (id) do nothing;
drop policy if exists "public view product images" on storage.objects;
create policy "public view product images" on storage.objects for select to anon,authenticated using(bucket_id='product-images');
drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects for insert to authenticated with check(bucket_id='product-images' and (select public.is_shop_admin()));
drop policy if exists "admin remove product images" on storage.objects;
create policy "admin remove product images" on storage.objects for delete to authenticated using(bucket_id='product-images' and (select public.is_shop_admin()));
-- After creating user in Supabase Auth, replace UUID below and run separately:
-- insert into public.admin_users(user_id) values ('YOUR-AUTH-USER-UUID');

-- Якщо стара таблиця вже створена зі старим обмеженням category:
-- ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;
-- ALTER TABLE public.products ADD CONSTRAINT products_category_check CHECK(category IN ('red','black','sets','other'));
