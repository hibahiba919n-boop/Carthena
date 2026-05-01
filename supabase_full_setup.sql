-- CARTHENA full Supabase setup (no localStorage)
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

-- PRODUCTS
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12,2) not null default 0,
  brand text not null,
  style text not null,
  description text not null default '',
  image_url text not null,
  stock integer not null default 0,
  color_variants jsonb,
  is_on_promo boolean not null default false,
  discounted_price numeric(12,2),
  created_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color text not null,
  size text not null,
  stock integer not null default 0,
  created_at timestamptz not null default now(),
  unique(product_id, color, size)
);

-- CART
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1,
  selected_size text,
  selected_color text,
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- WISHLIST
create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(session_id, product_id)
);

-- REVIEWS
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

-- SHIPPING + PROMO
create table if not exists public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  wilaya text not null unique,
  fee numeric(12,2) not null default 600,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- ORDERS + TRACKING
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_last_name text not null,
  customer_first_name text not null,
  phone text not null,
  wilaya text not null,
  product_id uuid not null references public.products(id),
  product_name text not null,
  selected_size text,
  selected_color text,
  subtotal numeric(12,2),
  shipping_fee numeric(12,2),
  promo_code text,
  discount_amount numeric(12,2),
  total_amount numeric(12,2),
  tracking_token text unique not null,
  status text not null default 'pending' check (status in ('pending','processed','shipped','delivered','refused')),
  created_at timestamptz not null default now()
);

-- Reconcile existing orders table (important if table already existed)
alter table public.orders add column if not exists selected_size text;
alter table public.orders add column if not exists selected_color text;
alter table public.orders add column if not exists subtotal numeric(12,2);
alter table public.orders add column if not exists shipping_fee numeric(12,2);
alter table public.orders add column if not exists promo_code text;
alter table public.orders add column if not exists discount_amount numeric(12,2);
alter table public.orders add column if not exists total_amount numeric(12,2);
alter table public.orders add column if not exists tracking_token text;

-- Backfill tracking tokens for old rows, then enforce uniqueness
update public.orders
set tracking_token = upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10))
where tracking_token is null or tracking_token = '';

create unique index if not exists idx_orders_tracking_unique on public.orders(tracking_token);

create table if not exists public.order_tracking_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

-- ANALYTICS + NOTIFICATIONS QUEUE
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email','whatsapp')),
  recipient text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  created_at timestamptz not null default now()
);

-- Trigger: on order insert, add tracking event + notification jobs
create or replace function public.after_order_insert()
returns trigger as $$
begin
  insert into public.order_tracking_events(order_id, status, note)
  values (new.id, new.status, 'Commande créée');

  insert into public.notification_queue(channel, recipient, payload)
  values
    ('email', null, jsonb_build_object('order_id', new.id, 'tracking_token', new.tracking_token, 'phone', new.phone)),
    ('whatsapp', new.phone, jsonb_build_object('order_id', new.id, 'tracking_token', new.tracking_token));
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_after_order_insert on public.orders;
create trigger trg_after_order_insert
after insert on public.orders
for each row execute function public.after_order_insert();

-- Basic indexes
create index if not exists idx_products_style on public.products(style);
create index if not exists idx_variant_product on public.product_variants(product_id);
create index if not exists idx_cart_items_cart on public.cart_items(cart_id);
create index if not exists idx_orders_tracking on public.orders(tracking_token);

-- RLS (public demo policy)
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.product_reviews enable row level security;
alter table public.shipping_rates enable row level security;
alter table public.promo_codes enable row level security;
alter table public.orders enable row level security;
alter table public.order_tracking_events enable row level security;
alter table public.analytics_events enable row level security;
alter table public.notification_queue enable row level security;

do $$
begin
  -- permissive policies for anon/client usage
  if not exists (select 1 from pg_policies where tablename = 'products' and policyname = 'products_all') then
    create policy products_all on public.products for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'product_images' and policyname = 'product_images_all') then
    create policy product_images_all on public.product_images for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'product_variants' and policyname = 'product_variants_all') then
    create policy product_variants_all on public.product_variants for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'carts' and policyname = 'carts_all') then
    create policy carts_all on public.carts for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'cart_items' and policyname = 'cart_items_all') then
    create policy cart_items_all on public.cart_items for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'wishlists' and policyname = 'wishlists_all') then
    create policy wishlists_all on public.wishlists for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'product_reviews' and policyname = 'product_reviews_all') then
    create policy product_reviews_all on public.product_reviews for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'shipping_rates' and policyname = 'shipping_rates_all') then
    create policy shipping_rates_all on public.shipping_rates for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'promo_codes' and policyname = 'promo_codes_all') then
    create policy promo_codes_all on public.promo_codes for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'orders' and policyname = 'orders_all') then
    create policy orders_all on public.orders for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'order_tracking_events' and policyname = 'order_tracking_events_all') then
    create policy order_tracking_events_all on public.order_tracking_events for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'analytics_events' and policyname = 'analytics_events_all') then
    create policy analytics_events_all on public.analytics_events for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'notification_queue' and policyname = 'notification_queue_all') then
    create policy notification_queue_all on public.notification_queue for all using (true) with check (true);
  end if;
end $$;

-- Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
