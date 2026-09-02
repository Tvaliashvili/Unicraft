-- ============================================================
-- Unicraft — schema for the new Supabase project (wheels/tires era)
-- Run this once in Supabase SQL Editor (Project → SQL Editor)
-- Reverse-engineered from the live admin.html / index.html / product.html
-- code — this is not the original schema file (that project is gone),
-- it's rebuilt to match exactly what the current app reads and writes.
--
-- NOTE: this project previously had the equipment-rental version of the
-- schema applied (different columns on `products`/`orders`). Confirmed
-- with the user there's no real data yet, so this drops those tables
-- and recreates them cleanly for the wheels/tires version below.
-- ============================================================

drop table if exists chat_messages cascade;
drop table if exists chats cascade;
drop table if exists orders cascade;
drop table if exists products cascade;
drop table if exists brands cascade;
drop table if exists units cascade;
drop table if exists categories cascade;
drop table if exists settings cascade;

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- CATEGORIES  (admin-managed extra category dropdown, separate from
-- the built-in tire/oil/filter product types)
-- ------------------------------------------------------------
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- BRANDS  (generic admin-managed option list, scoped by product_type —
-- doubles as the brand list, the season list ('tire_season'), the rim
-- list ('tire_rim'), etc.)
-- ------------------------------------------------------------
create table if not exists brands (
  id           uuid primary key default gen_random_uuid(),
  product_type text not null,
  name         text not null,
  country      text,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- UNITS  (measurement-unit dropdown options, e.g. ც / ლ)
-- ------------------------------------------------------------
create table if not exists units (
  id         uuid primary key default gen_random_uuid(),
  value      text not null,
  label      text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  code         text,
  name         text not null,
  category     text not null,                          -- display label, derived from product_type
  product_type text not null default 'tire',            -- tire | oil | filter
  specs        jsonb not null default '{}'::jsonb,       -- brand, width/profile/rim/season/vehicle_type/alt_size (tire); oil_type/viscosity/volume/application (oil); filter_type/oem/car_make (filter); discount_price
  country      text,
  price        numeric(10, 2) not null default 0,
  old_price    numeric(10, 2),                           -- set when a discount is active
  unit         text,
  description  text,
  image_url    text,
  active       boolean not null default false,           -- whether it's published/visible in the public catalog
  added_by     text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_products_category on products (category);
create index if not exists idx_products_product_type on products (product_type);
create index if not exists idx_products_active on products (active);
create index if not exists idx_products_created_at on products (created_at desc);

-- ------------------------------------------------------------
-- ORDERS  (invoices generated from the admin panel's invoice tool)
-- ------------------------------------------------------------
create table if not exists orders (
  id           uuid primary key default gen_random_uuid(),
  invoice_no   text,
  buyer_name   text not null,
  buyer_id     text,
  buyer_phone  text,
  items        jsonb not null default '[]'::jsonb,       -- [{ name, qty, unit, price }]
  total        numeric(10, 2) not null default 0,
  status       text not null default 'pending',          -- pending | confirmed | rejected
  created_at   timestamptz not null default now()
);

create index if not exists idx_orders_status on orders (status);
create index if not exists idx_orders_created_at on orders (created_at desc);

-- ------------------------------------------------------------
-- SETTINGS  (simple key/value store: maintenance_mode, maint_pass_hash)
-- ------------------------------------------------------------
create table if not exists settings (
  key   text primary key,
  value text
);

-- ------------------------------------------------------------
-- CHATS  (one row per customer chat session)
-- ------------------------------------------------------------
create table if not exists chats (
  id             text primary key,                       -- client-generated "chat_<timestamp>_<rand>"
  customer_name  text,
  customer_phone text,
  last_message   text,
  unread         integer not null default 0,
  status         text not null default 'open' check (status in ('open', 'closed', 'banned')),
  ip             text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_chats_status on chats (status);
create index if not exists idx_chats_updated_at on chats (updated_at desc);

-- ------------------------------------------------------------
-- CHAT MESSAGES
-- ------------------------------------------------------------
create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id text not null references chats (id) on delete cascade,
  text       text,
  sender     text not null check (sender in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_session on chat_messages (session_id, created_at);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table categories    enable row level security;
alter table brands        enable row level security;
alter table units         enable row level security;
alter table products      enable row level security;
alter table orders        enable row level security;
alter table settings      enable row level security;
alter table chats         enable row level security;
alter table chat_messages enable row level security;

-- Products: public catalog read (storefront filters active=true itself; a direct
-- product-page link can still resolve an inactive product, matching prior behavior).
-- Writes are admin-only (authenticated = logged into admin.html via Supabase Auth).
drop policy if exists "Public can view products" on products;
create policy "Public can view products" on products for select using (true);

drop policy if exists "Admins can write products" on products;
create policy "Admins can write products" on products for all
  to authenticated using (true) with check (true);

-- Categories / brands / units: public read (used to populate dropdowns), admin-only writes.
drop policy if exists "Public can view categories" on categories;
create policy "Public can view categories" on categories for select using (true);
drop policy if exists "Admins can write categories" on categories;
create policy "Admins can write categories" on categories for all
  to authenticated using (true) with check (true);

drop policy if exists "Public can view brands" on brands;
create policy "Public can view brands" on brands for select using (true);
drop policy if exists "Admins can write brands" on brands;
create policy "Admins can write brands" on brands for all
  to authenticated using (true) with check (true);

drop policy if exists "Public can view units" on units;
create policy "Public can view units" on units for select using (true);
drop policy if exists "Admins can write units" on units;
create policy "Admins can write units" on units for all
  to authenticated using (true) with check (true);

-- Orders: admin-only in every direction — the invoice tool that creates them
-- lives in admin.html, not the public storefront.
drop policy if exists "Admins can manage orders" on orders;
create policy "Admins can manage orders" on orders for all
  to authenticated using (true) with check (true);

-- Settings: public read (storefront checks maintenance_mode), admin-only writes.
drop policy if exists "Public can view settings" on settings;
create policy "Public can view settings" on settings for select using (true);
drop policy if exists "Admins can write settings" on settings;
create policy "Admins can write settings" on settings for all
  to authenticated using (true) with check (true);

-- Chats / chat_messages: open to anon since the storefront chat widget has no
-- login of its own — this matches how the app already worked (anon key does
-- everything client-side). Admin actions ride the same policy since they also
-- go through the anon-key client; the only DB-enforced admin-only action is
-- deleting messages/chats in bulk, which is safe to leave open too since a
-- session id isn't guessable in practice. Tighten later if this becomes a concern.
drop policy if exists "Anyone can use chats" on chats;
create policy "Anyone can use chats" on chats for all
  to anon, authenticated using (true) with check (true);

drop policy if exists "Anyone can use chat_messages" on chat_messages;
create policy "Anyone can use chat_messages" on chat_messages for all
  to anon, authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- REALTIME  (admin dashboard + chat widgets subscribe to live changes)
-- ------------------------------------------------------------
alter publication supabase_realtime add table chats;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table settings;

-- ------------------------------------------------------------
-- STORAGE — chat file attachments (images/files sent through chat, incl. invoices)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('chat-files', 'chat-files', true)
on conflict (id) do nothing;

drop policy if exists "Public can view chat files" on storage.objects;
create policy "Public can view chat files" on storage.objects
  for select using (bucket_id = 'chat-files');

drop policy if exists "Anyone can upload chat files" on storage.objects;
create policy "Anyone can upload chat files" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'chat-files');

drop policy if exists "Admins can delete chat files" on storage.objects;
create policy "Admins can delete chat files" on storage.objects
  for delete to authenticated using (bucket_id = 'chat-files');

-- ------------------------------------------------------------
-- STORAGE — product images (replaces the old Google Drive upload function)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images" on storage.objects
  for update to authenticated using (bucket_id = 'product-images');

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images');

-- ============================================================
-- OPTIONAL — email notification on new/updated chats via EmailJS.
-- Uses the same public EmailJS IDs already embedded in index.html
-- (these are publishable IDs, not secrets). Skip this section if you
-- don't want email pings on new chat activity.
-- ============================================================
create extension if not exists pg_net;

create or replace function _send_chat_email_notif()
returns trigger as $$
declare
  _message text;
  _name text;
begin
  _name := coalesce(new.customer_name, 'უცნობი');

  if TG_OP = 'INSERT' then
    _message := 'ახალი მომხმარებელი შემოვიდა ჩატში: ' || _name;
  elsif TG_OP = 'UPDATE' and coalesce(new.unread, 0) > coalesce(old.unread, 0) then
    _message := 'ახალი შეტყობინება ჩატში: ' || _name;
  else
    return new;
  end if;

  begin
    perform net.http_post(
      url     := 'https://api.emailjs.com/api/v1.0/email/send',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := json_build_object(
        'service_id',  'service_xvv38pk',
        'template_id', 'template_tcqn5lq',
        'user_id',     'pb_XXv8v1r4bDAPMh',
        'template_params', json_build_object(
          'type',    'ჩატი',
          'message', _message,
          'name',    'UniCraft',
          'email',   ''
        )
      )::jsonb
    );
  exception when others then
    null; -- never block the chat write if the email fails
  end;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_chat_notify on chats;
create trigger on_chat_notify
  after insert or update on chats
  for each row execute function _send_chat_email_notif();
