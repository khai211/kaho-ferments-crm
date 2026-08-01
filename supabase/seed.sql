-- Sample menu data so the app has something to display out of the box.
-- Replace image URLs with your own photos, and edit/add items from the
-- Supabase dashboard's Table Editor.

insert into menu_items (name, description, price, category, image, available) values
  ('Chicken Rice', 'Steamed chicken, fragrant rice, chilli and ginger sauce.', 6.50, 'Mains', 'https://placehold.co/600x400?text=Chicken+Rice', true),
  ('Nasi Lemak', 'Coconut rice, fried anchovies, peanuts, egg and sambal.', 7.00, 'Mains', 'https://placehold.co/600x400?text=Nasi+Lemak', true),
  ('Laksa', 'Spicy coconut noodle soup with prawns and fish cake.', 7.50, 'Mains', 'https://placehold.co/600x400?text=Laksa', true),
  ('Char Kway Teow', 'Wok-fried flat rice noodles with prawns and egg.', 7.00, 'Mains', 'https://placehold.co/600x400?text=Char+Kway+Teow', false),
  ('Kaya Toast Set', 'Toast with kaya and butter, two soft-boiled eggs.', 4.50, 'Sides', 'https://placehold.co/600x400?text=Kaya+Toast', true),
  ('Curry Puff', 'Crisp pastry filled with curried potato and chicken.', 2.00, 'Sides', 'https://placehold.co/600x400?text=Curry+Puff', true),
  ('Kopi O', 'Black coffee with sugar.', 1.80, 'Drinks', 'https://placehold.co/600x400?text=Kopi+O', true),
  ('Teh Tarik', 'Pulled milk tea.', 2.00, 'Drinks', 'https://placehold.co/600x400?text=Teh+Tarik', true),
  ('Iced Lemon Tea', 'Freshly brewed tea with lemon, served over ice.', 2.20, 'Drinks', 'https://placehold.co/600x400?text=Iced+Lemon+Tea', true),
  ('Chendol', 'Shaved ice, coconut milk, gula melaka and jelly.', 3.50, 'Desserts', 'https://placehold.co/600x400?text=Chendol', true);
