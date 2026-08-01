-- F&B ordering app schema.
-- Run this in the Supabase SQL editor for a new project (SQL Editor > New query > paste > Run).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- menu_items
-- ---------------------------------------------------------------------------
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  category text not null,
  image text,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists menu_items_category_idx on menu_items (category);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  customer_contact text not null,
  table_number text,
  total numeric(10, 2) not null check (total >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled', 'expired')),
  hitpay_payment_request_id text,
  hitpay_url text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_reference_idx on orders (reference);
create index if not exists orders_hitpay_payment_request_id_idx on orders (hitpay_payment_request_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  menu_item_id uuid references menu_items (id) on delete set null,
  item_name text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  qty integer not null check (qty > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on order_items (order_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Public (anon) can read the menu. No insert/update/delete policies, so the
-- menu can only be managed from the Supabase dashboard or the service role.
create policy "menu_items are publicly readable"
  on menu_items for select
  to anon, authenticated
  using (true);

-- orders and order_items have RLS enabled with NO policies for anon/authenticated,
-- which means the browser cannot read or write them at all. All access happens
-- via the service role key inside Route Handlers, which bypasses RLS.
