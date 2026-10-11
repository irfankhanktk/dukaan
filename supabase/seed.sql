-- Seed: super admin, Ali Bakers & Sweets (Satellite Town, Rawalpindi), menu templates.
--
-- The super admin line only takes effect once that account exists — sign up first
-- (or create the user in Supabase Auth), then run this file (it is safe to re-run).

-- ---------------------------------------------------------------------------
-- Super admin
-- ---------------------------------------------------------------------------
insert into public.profiles (id, platform_role)
select id, 'super_admin' from auth.users where email = 'irrfankhanktk@gmail.com'
on conflict (id) do update set platform_role = 'super_admin';

-- ---------------------------------------------------------------------------
-- Demo shop
-- ---------------------------------------------------------------------------
insert into public.shops (id, slug, name, city, area, whatsapp_number, cover_color, business_type,
                          delivery_fee, min_order, pickup_enabled, is_open, opening_hours,
                          status, plan, monthly_fee, onboarding_step)
values ('11111111-1111-4111-8111-111111111111', 'ali-bakers', 'Ali Bakers & Sweets',
        'Rawalpindi', 'Satellite Town', '923001234567', '#0F5C4A', 'bakery',
        100, 300, true, true,
        '{"prep_time": "30–45 min", "days": {
           "mon": {"open": "09:00", "close": "23:00", "closed": false},
           "tue": {"open": "09:00", "close": "23:00", "closed": false},
           "wed": {"open": "09:00", "close": "23:00", "closed": false},
           "thu": {"open": "09:00", "close": "23:00", "closed": false},
           "fri": {"open": "14:00", "close": "23:00", "closed": false},
           "sat": {"open": "09:00", "close": "23:30", "closed": false},
           "sun": {"open": "09:00", "close": "23:30", "closed": false}}}',
        'active', 'standard', 2000, 5)
on conflict (id) do nothing;

insert into public.categories (id, shop_id, name, sort_order) values
  ('22222222-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Cakes', 1),
  ('22222222-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Bakery', 2),
  ('22222222-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Sweets', 3),
  ('22222222-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Drinks', 4)
on conflict (id) do nothing;

insert into public.products (id, shop_id, category_id, name, description, base_price, unit, qty_step, sort_order) values
  ('33333333-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '22222222-0000-4000-8000-000000000001',
   'Chocolate Fudge Cake', 'Rich chocolate layers with fudge frosting', 1200, 'piece', 1, 1),
  ('33333333-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '22222222-0000-4000-8000-000000000001',
   'Pineapple Cake', 'Light sponge with fresh cream and pineapple', 1100, 'piece', 1, 2),
  ('33333333-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', '22222222-0000-4000-8000-000000000002',
   'Chicken Patties', 'Flaky puff pastry, box of 6', 480, 'box', 1, 1),
  ('33333333-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', '22222222-0000-4000-8000-000000000002',
   'Chicken Sandwich', 'Grilled chicken, fresh bread', 350, 'piece', 1, 2),
  ('33333333-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', '22222222-0000-4000-8000-000000000003',
   'Gulab Jamun', 'Soft and syrupy, made fresh daily', 850, 'kg', 0.5, 1),
  ('33333333-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', '22222222-0000-4000-8000-000000000003',
   'Mix Mithai', 'Barfi, laddu, kalakand and more', 1100, 'kg', 0.5, 2),
  ('33333333-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', '22222222-0000-4000-8000-000000000004',
   'Cold Coffee', 'Chilled, creamy, house blend', 300, 'piece', 1, 1)
on conflict (id) do nothing;

insert into public.option_groups (id, product_id, name, type, is_required, min_select, max_select, sort_order) values
  ('44444444-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000001', 'Size', 'single', true, 1, 1, 1),
  ('44444444-0000-4000-8000-000000000002', '33333333-0000-4000-8000-000000000001', 'Extras', 'multiple', false, 0, 3, 2),
  ('44444444-0000-4000-8000-000000000003', '33333333-0000-4000-8000-000000000001', 'Message on cake', 'text', false, 0, null, 3),
  ('44444444-0000-4000-8000-000000000004', '33333333-0000-4000-8000-000000000002', 'Size', 'single', true, 1, 1, 1),
  ('44444444-0000-4000-8000-000000000005', '33333333-0000-4000-8000-000000000007', 'Size', 'single', true, 1, 1, 1)
on conflict (id) do nothing;

insert into public.option_values (id, option_group_id, name, price_delta, sort_order) values
  ('55555555-0000-4000-8000-000000000001', '44444444-0000-4000-8000-000000000001', '1 lb', 0, 1),
  ('55555555-0000-4000-8000-000000000002', '44444444-0000-4000-8000-000000000001', '2 lb', 1100, 2),
  ('55555555-0000-4000-8000-000000000003', '44444444-0000-4000-8000-000000000001', '3 lb', 2200, 3),
  ('55555555-0000-4000-8000-000000000004', '44444444-0000-4000-8000-000000000002', 'Birthday candles', 100, 1),
  ('55555555-0000-4000-8000-000000000005', '44444444-0000-4000-8000-000000000002', 'Extra chocolate', 200, 2),
  ('55555555-0000-4000-8000-000000000006', '44444444-0000-4000-8000-000000000002', 'Gift box', 150, 3),
  ('55555555-0000-4000-8000-000000000007', '44444444-0000-4000-8000-000000000004', '1 lb', 0, 1),
  ('55555555-0000-4000-8000-000000000008', '44444444-0000-4000-8000-000000000004', '2 lb', 1000, 2),
  ('55555555-0000-4000-8000-000000000009', '44444444-0000-4000-8000-000000000005', 'Regular', 0, 1),
  ('55555555-0000-4000-8000-000000000010', '44444444-0000-4000-8000-000000000005', 'Large', 100, 2)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Menu templates (prices are starting points the admin edits per shop)
-- ---------------------------------------------------------------------------
insert into public.menu_templates (id, business_type, name, items) values
('66666666-0000-4000-8000-000000000001', 'bakery', 'Bakery starter menu', '{"categories": [
  {"name": "Cakes", "products": [
    {"name": "Chocolate Fudge Cake", "description": "Rich chocolate layers with fudge frosting", "base_price": 1200, "unit": "piece", "qty_step": 1,
     "option_groups": [
       {"name": "Size", "type": "single", "is_required": true, "min_select": 1, "max_select": 1,
        "values": [{"name": "1 lb", "price_delta": 0}, {"name": "2 lb", "price_delta": 1100}, {"name": "3 lb", "price_delta": 2200}]},
       {"name": "Extras", "type": "multiple", "is_required": false, "min_select": 0, "max_select": 3,
        "values": [{"name": "Birthday candles", "price_delta": 100}, {"name": "Gift box", "price_delta": 150}]},
       {"name": "Message on cake", "type": "text", "is_required": false, "min_select": 0, "max_select": null, "values": []}]},
    {"name": "Pineapple Cake", "description": "Fresh cream and pineapple", "base_price": 1100, "unit": "piece", "qty_step": 1,
     "option_groups": [{"name": "Size", "type": "single", "is_required": true, "min_select": 1, "max_select": 1,
        "values": [{"name": "1 lb", "price_delta": 0}, {"name": "2 lb", "price_delta": 1000}]}]}]},
  {"name": "Bakery", "products": [
    {"name": "Chicken Patties", "description": "Box of 6", "base_price": 480, "unit": "box", "qty_step": 1, "option_groups": []},
    {"name": "Plain Rusk", "description": "Crispy tea rusk", "base_price": 350, "unit": "box", "qty_step": 1, "option_groups": []},
    {"name": "Bread (Large)", "description": "Fresh daily", "base_price": 220, "unit": "piece", "qty_step": 1, "option_groups": []}]},
  {"name": "Sweets", "products": [
    {"name": "Gulab Jamun", "description": "Made fresh daily", "base_price": 850, "unit": "kg", "qty_step": 0.5, "option_groups": []},
    {"name": "Mix Mithai", "description": "Barfi, laddu, kalakand", "base_price": 1100, "unit": "kg", "qty_step": 0.5, "option_groups": []}]},
  {"name": "Drinks", "products": [
    {"name": "Cold Coffee", "description": "Chilled and creamy", "base_price": 300, "unit": "piece", "qty_step": 1,
     "option_groups": [{"name": "Size", "type": "single", "is_required": true, "min_select": 1, "max_select": 1,
        "values": [{"name": "Regular", "price_delta": 0}, {"name": "Large", "price_delta": 100}]}]}]}
]}'),
('66666666-0000-4000-8000-000000000002', 'restaurant', 'Restaurant starter menu', '{"categories": [
  {"name": "Starters", "products": [
    {"name": "Chicken Wings", "description": "6 pieces", "base_price": 650, "unit": "piece", "qty_step": 1,
     "option_groups": [{"name": "Flavour", "type": "single", "is_required": true, "min_select": 1, "max_select": 1,
        "values": [{"name": "BBQ", "price_delta": 0}, {"name": "Hot", "price_delta": 0}, {"name": "Honey garlic", "price_delta": 50}]}]}]},
  {"name": "Mains", "products": [
    {"name": "Chicken Biryani", "description": "With raita and salad", "base_price": 450, "unit": "piece", "qty_step": 1,
     "option_groups": [{"name": "Size", "type": "single", "is_required": true, "min_select": 1, "max_select": 1,
        "values": [{"name": "Single", "price_delta": 0}, {"name": "Full", "price_delta": 350}]}]},
    {"name": "Chicken Karahi", "description": "Fresh tomato karahi", "base_price": 1600, "unit": "piece", "qty_step": 1,
     "option_groups": [{"name": "Size", "type": "single", "is_required": true, "min_select": 1, "max_select": 1,
        "values": [{"name": "Half", "price_delta": 0}, {"name": "Full", "price_delta": 1400}]}]}]},
  {"name": "Breads", "products": [
    {"name": "Roghni Naan", "description": null, "base_price": 60, "unit": "piece", "qty_step": 1, "option_groups": []}]},
  {"name": "Drinks", "products": [
    {"name": "Soft Drink", "description": "500 ml", "base_price": 120, "unit": "piece", "qty_step": 1, "option_groups": []}]}
]}'),
('66666666-0000-4000-8000-000000000003', 'home_kitchen', 'Home kitchen starter menu', '{"categories": [
  {"name": "Daily menu", "products": [
    {"name": "Chicken Pulao", "description": "Home-style, per plate", "base_price": 400, "unit": "piece", "qty_step": 1, "option_groups": []},
    {"name": "Daal Chawal", "description": "Per plate", "base_price": 300, "unit": "piece", "qty_step": 1, "option_groups": []}]},
  {"name": "Frozen", "products": [
    {"name": "Chicken Samosa", "description": "Frozen, ready to fry", "base_price": 900, "unit": "dozen", "qty_step": 1, "option_groups": []},
    {"name": "Shami Kabab", "description": "Frozen", "base_price": 1000, "unit": "dozen", "qty_step": 1, "option_groups": []}]}
]}'),
('66666666-0000-4000-8000-000000000004', 'grocery', 'Kiryana starter menu', '{"categories": [
  {"name": "Daily essentials", "products": [
    {"name": "Doodh (Milk)", "description": "Fresh milk", "base_price": 220, "unit": "kg", "qty_step": 0.5, "option_groups": []},
    {"name": "Anday (Eggs)", "description": null, "base_price": 330, "unit": "dozen", "qty_step": 1, "option_groups": []},
    {"name": "Atta", "description": "Chakki atta", "base_price": 130, "unit": "kg", "qty_step": 1,
     "option_groups": [{"name": "Weight", "type": "single", "is_required": true, "min_select": 1, "max_select": 1,
        "values": [{"name": "5 kg", "price_delta": 0}, {"name": "10 kg", "price_delta": 0}]}]}]},
  {"name": "Snacks", "products": [
    {"name": "Biscuits (family pack)", "description": null, "base_price": 150, "unit": "piece", "qty_step": 1, "option_groups": []}]},
  {"name": "Drinks", "products": [
    {"name": "Mineral Water", "description": "1.5 litre", "base_price": 120, "unit": "piece", "qty_step": 1, "option_groups": []}]}
]}'),
('66666666-0000-4000-8000-000000000005', 'pharmacy', 'Pharmacy starter menu', '{"categories": [
  {"name": "Medicines", "products": [
    {"name": "Panadol", "description": "Strip of 10", "base_price": 40, "unit": "piece", "qty_step": 1, "option_groups": []},
    {"name": "ORS", "description": "Sachet", "base_price": 30, "unit": "piece", "qty_step": 1, "option_groups": []}]},
  {"name": "Personal care", "products": [
    {"name": "Hand Sanitizer", "description": "100 ml", "base_price": 250, "unit": "piece", "qty_step": 1, "option_groups": []}]}
]}')
on conflict (id) do nothing;
