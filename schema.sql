-- ============================================================
-- Unicraft Dropshipping Store — Supabase Schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor)
-- ============================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
create table if not exists products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  base_cost      numeric(10, 2) not null default 0,   -- what you pay the supplier (admin-only visibility in UI)
  selling_price  numeric(10, 2) not null default 0,   -- what the customer pays
  category       text not null default 'uncategorized',
  image_url      text,
  in_stock       boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_products_category on products (category);
create index if not exists idx_products_created_at on products (created_at desc);

-- keep updated_at fresh
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row
  execute function set_updated_at();

-- ------------------------------------------------------------
-- ORDERS
-- ------------------------------------------------------------
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  customer_name    text not null,
  customer_phone   text not null,
  delivery_address text not null,
  items            jsonb not null default '[]'::jsonb,  -- [{ product_id, name, price, qty }]
  total_amount     numeric(10, 2) not null default 0,
  status           text not null default 'New'
                   check (status in ('New', 'In Transit', 'Delivered')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_orders_status on orders (status);
create index if not exists idx_orders_created_at on orders (created_at desc);

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
  before update on orders
  for each row
  execute function set_updated_at();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table products enable row level security;
alter table orders   enable row level security;

-- Products: anyone (including anonymous storefront visitors) can read.
drop policy if exists "Public can view products" on products;
create policy "Public can view products"
  on products for select
  using (true);

-- Products: only authenticated admins can insert/update/delete.
drop policy if exists "Admins can insert products" on products;
create policy "Admins can insert products"
  on products for insert
  to authenticated
  with check (true);

drop policy if exists "Admins can update products" on products;
create policy "Admins can update products"
  on products for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admins can delete products" on products;
create policy "Admins can delete products"
  on products for delete
  to authenticated
  using (true);

-- Orders: anyone can place an order (public checkout form), but cannot read/update.
drop policy if exists "Public can create orders" on orders;
create policy "Public can create orders"
  on orders for insert
  to anon, authenticated
  with check (true);

-- Orders: only authenticated admins can view and manage them.
drop policy if exists "Admins can view orders" on orders;
create policy "Admins can view orders"
  on orders for select
  to authenticated
  using (true);

drop policy if exists "Admins can update orders" on orders;
create policy "Admins can update orders"
  on orders for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admins can delete orders" on orders;
create policy "Admins can delete orders"
  on orders for delete
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- STORAGE — product images bucket
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');
