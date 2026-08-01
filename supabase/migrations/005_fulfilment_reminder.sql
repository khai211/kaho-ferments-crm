-- Pickup/delivery reminder: a 4th sequence step anchored to the order's
-- fulfilment date instead of when it was paid for.

alter table orders
  add column if not exists fulfilment_type text,
  add column if not exists fulfilment_date date,
  add column if not exists fulfilment_time text,
  add column if not exists fulfilment_location text;

alter table sequence_steps
  add column if not exists anchor text not null default 'paid_at';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'sequence_steps'::regclass and conname = 'sequence_steps_anchor_check'
  ) then
    alter table sequence_steps
      add constraint sequence_steps_anchor_check check (anchor in ('paid_at', 'fulfilment_date'));
  end if;
end $$;

insert into sequence_steps (step_order, name, delay_days, subject, body, is_birthday, anchor)
values
  (5, 'Pickup/delivery reminder', -1,
   'Reminder: your {{flavor}} pickup/delivery is tomorrow',
   'Hi {{first_name}},' || E'\n\n' ||
   'Just a reminder that your {{flavor}} is scheduled for {{pickup_date}} at {{pickup_time}}.' || E'\n\n' ||
   '{{pickup_location}}' || E'\n\n' ||
   'See you then!' || E'\n\n' ||
   '— Kaho Ferments',
   false, 'fulfilment_date')
on conflict (step_order) do nothing;
