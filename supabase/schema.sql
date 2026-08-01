-- Kaho Ferments CRM — base schema.
-- Run this in the Supabase SQL editor for a new project (SQL Editor > New query > paste > Run),
-- then run supabase/migrations/*.sql in order.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  customer_contact text not null,
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
alter table orders enable row level security;
alter table order_items enable row level security;

-- orders and order_items have RLS enabled with NO policies for anon/authenticated,
-- which means the browser cannot read or write them at all. All access happens
-- via the service role key inside Route Handlers, which bypasses RLS.
