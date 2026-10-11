-- Add the 'stationery' business type and a starter menu template for stationery shops.

alter table public.shops drop constraint if exists shops_business_type_check;
alter table public.shops add constraint shops_business_type_check
  check (business_type in ('restaurant', 'bakery', 'home_kitchen', 'grocery', 'pharmacy', 'stationery', 'clothing', 'other'));

alter table public.menu_templates drop constraint if exists menu_templates_business_type_check;
alter table public.menu_templates add constraint menu_templates_business_type_check
  check (business_type in ('restaurant', 'bakery', 'home_kitchen', 'grocery', 'pharmacy', 'stationery', 'clothing', 'other'));

alter table public.shop_requests drop constraint if exists shop_requests_business_type_check;
alter table public.shop_requests add constraint shop_requests_business_type_check
  check (business_type in ('restaurant', 'bakery', 'home_kitchen', 'grocery', 'pharmacy', 'stationery', 'clothing', 'other'));

insert into public.menu_templates (id, business_type, name, items) values
('66666666-0000-4000-8000-000000000006', 'stationery', 'Stationery starter menu', '{"categories": [
  {"name": "Registers", "products": [
    {"name": "Noman Rough Register 501", "description": null, "base_price": 220, "unit": "piece", "qty_step": 1, "option_groups": []},
    {"name": "Noman Rough Register 502", "description": null, "base_price": 320, "unit": "piece", "qty_step": 1, "option_groups": []},
    {"name": "Noman Rough Register 503", "description": null, "base_price": 350, "unit": "piece", "qty_step": 1, "option_groups": []},
    {"name": "Noman Register 3-in-1 300", "description": null, "base_price": 220, "unit": "piece", "qty_step": 1, "option_groups": []},
    {"name": "Noman Register 3-in-1 5", "description": null, "base_price": 150, "unit": "piece", "qty_step": 1, "option_groups": []},
    {"name": "Raza Register 3-in-1 LR20", "description": null, "base_price": 250, "unit": "piece", "qty_step": 1, "option_groups": []}]}
]}')
on conflict (id) do nothing;
