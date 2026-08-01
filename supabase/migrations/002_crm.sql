-- Mini CRM + post-purchase email sequence.
-- Run this in the Supabase SQL editor after schema.sql (reuses its
-- set_updated_at() trigger function).

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  address text,
  birthday date,
  birthday_capture_token uuid not null default gen_random_uuid(),
  birthday_reward_sent_year int,
  order_count int not null default 0,
  first_order_at timestamptz,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Partial unique indexes: email/phone are optional, but when present must be
-- unique so upsert-by-email/phone has something to conflict on.
create unique index if not exists customers_email_key
  on customers (lower(email)) where email is not null;
create unique index if not exists customers_phone_key
  on customers (phone) where phone is not null;
create unique index if not exists customers_birthday_token_key
  on customers (birthday_capture_token);

drop trigger if exists customers_set_updated_at on customers;
create trigger customers_set_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- orders: link to customers, track where the order came from
-- ---------------------------------------------------------------------------
alter table orders
  add column if not exists customer_id uuid references customers (id),
  add column if not exists source text not null default 'app'
    check (source in ('app', 'mock_store'));

create index if not exists orders_customer_id_idx on orders (customer_id);

-- ---------------------------------------------------------------------------
-- sequence_steps: editable post-purchase email steps (incl. birthday)
-- ---------------------------------------------------------------------------
create table if not exists sequence_steps (
  id uuid primary key default gen_random_uuid(),
  step_order int not null unique,
  name text not null,
  delay_days int not null default 0,
  subject text not null,
  body text not null,
  is_birthday boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists sequence_steps_set_updated_at on sequence_steps;
create trigger sequence_steps_set_updated_at
  before update on sequence_steps
  for each row execute function set_updated_at();

insert into sequence_steps (step_order, name, delay_days, subject, body, is_birthday)
values
  (1, 'Order confirmation', 0,
   'Thanks for your order, {{first_name}}!',
   'Hi {{first_name}},' || E'\n\n' ||
   'Thank you for ordering {{flavor}} from Kaho Ferments! We''re making it fresh for you.' || E'\n\n' ||
   'Order reference: {{order_reference}}' || E'\n\n' ||
   '— Kaho Ferments',
   false),
  (2, 'Check-in', 5,
   'How''s your {{flavor}} treating you?',
   'Hi {{first_name}},' || E'\n\n' ||
   'It''s been a few days since your {{flavor}} arrived — how are you enjoying it?' || E'\n\n' ||
   'Just reply to this email if you have any questions or feedback.' || E'\n\n' ||
   '— Kaho Ferments',
   false),
  (3, 'Review request', 10,
   'Got a minute to share your thoughts?',
   'Hi {{first_name}},' || E'\n\n' ||
   'Hope you''re loving your {{flavor}}! If you have a moment, we''d love to hear your feedback — it really helps a small batch business like ours.' || E'\n\n' ||
   'Also, if you''d like a treat on your birthday, let us know your birthday here: {{birthday_link}}' || E'\n\n' ||
   '— Kaho Ferments',
   false),
  (4, 'Birthday reward', 0,
   'Happy birthday from Kaho Ferments!',
   'Hi {{first_name}},' || E'\n\n' ||
   'Wishing you a wonderful birthday! Here''s a little treat from us — enjoy 10% off your next order.' || E'\n\n' ||
   '— Kaho Ferments',
   true)
on conflict (step_order) do nothing;

-- ---------------------------------------------------------------------------
-- sequence_sends: log of scheduled/sent steps per order (prevents duplicates)
-- ---------------------------------------------------------------------------
create table if not exists sequence_sends (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  step_id uuid not null references sequence_steps (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, step_id)
);

create index if not exists sequence_sends_due_idx
  on sequence_sends (due_at) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Row Level Security — service-role only, same convention as schema.sql
-- ---------------------------------------------------------------------------
alter table customers enable row level security;
alter table sequence_steps enable row level security;
alter table sequence_sends enable row level security;
