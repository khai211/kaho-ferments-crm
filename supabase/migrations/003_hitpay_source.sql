-- Allow orders.source = 'hitpay_store' (the real HitPay Event Webhook),
-- alongside the existing 'app' / 'mock_store' values from 002_crm.sql.
-- Finds the existing check constraint on the source column dynamically
-- rather than assuming its auto-generated name, so this is safe to run
-- regardless of exactly how Postgres named it.

do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%source%'
  loop
    execute format('alter table orders drop constraint %I', con.conname);
  end loop;
end $$;

alter table orders
  add constraint orders_source_check check (source in ('app', 'mock_store', 'hitpay_store'));
