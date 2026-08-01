-- Optional cleanup: removes dine-in-only schema left over after the F&B
-- ordering flow was deleted from the codebase (menu_items table, and the
-- orders/order_items columns only that flow used). Nothing in the CRM
-- reads any of this.
--
-- This IS destructive — it drops the menu_items table and its data, and
-- drops columns from orders. Only run it once you're sure you don't need
-- the original dine-in feature's data.

alter table order_items drop column if exists menu_item_id;
drop table if exists menu_items cascade;

alter table orders
  drop column if exists table_number,
  drop column if exists hitpay_payment_request_id,
  drop column if exists hitpay_url;
