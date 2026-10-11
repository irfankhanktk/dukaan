-- Dukaan: initial schema
-- Tables, helper functions, RLS policies, protected-column + audit triggers,
-- order placement functions, realtime and storage.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  platform_role text check (platform_role in ('super_admin', 'support')),
  created_at timestamptz not null default now()
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  city text,
  area text,
  whatsapp_number text not null check (whatsapp_number ~ '^92[0-9]{10}$'),
  logo_url text,
  cover_color text not null default '#0F5C4A',
  business_type text not null default 'other'
    check (business_type in ('restaurant', 'bakery', 'home_kitchen', 'grocery', 'pharmacy', 'clothing', 'other')),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  -- Optional per-area fees: [{ "name": "Satellite Town", "fee": 100 }]. Empty = flat delivery_fee.
  delivery_areas jsonb not null default '[]'::jsonb check (jsonb_typeof(delivery_areas) = 'array'),
  min_order integer not null default 0 check (min_order >= 0),
  pickup_enabled boolean not null default true,
  is_open boolean not null default true,
  -- { "prep_time": "30–45 min", "days": { "mon": { "open": "09:00", "close": "23:00", "closed": false }, ... } }
  opening_hours jsonb not null default '{}'::jsonb,
  status text not null default 'setup'
    check (status in ('setup', 'trial', 'active', 'payment_due', 'suspended')),
  plan text not null default 'standard',
  monthly_fee integer not null default 0 check (monthly_fee >= 0),
  paid_until date,
  onboarding_step integer not null default 1 check (onboarding_step between 1 and 5),
  qr_placed_at timestamptz, -- setup checklist: QR code placed in the shop
  went_live_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  next_order_number integer not null default 1001,
  created_at timestamptz not null default now()
);
create index shops_owner_id_idx on public.shops (owner_id);
create index shops_status_idx on public.shops (status);

create table public.shop_members (
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);
create index shop_members_user_id_idx on public.shop_members (user_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);
create index categories_shop_id_idx on public.categories (shop_id, sort_order);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  description text,
  base_price integer not null check (base_price >= 0),
  unit text not null default 'piece' check (unit in ('piece', 'kg', 'dozen', 'box')),
  qty_step numeric(6, 2) not null default 1 check (qty_step > 0),
  photo_url text,
  is_available boolean not null default true,
  details jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index products_shop_id_idx on public.products (shop_id, sort_order);
create index products_category_id_idx on public.products (category_id);

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  type text not null default 'single' check (type in ('single', 'multiple', 'text')),
  is_required boolean not null default false,
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer check (max_select is null or max_select >= 1),
  sort_order integer not null default 0
);
create index option_groups_product_id_idx on public.option_groups (product_id, sort_order);

create table public.option_values (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references public.option_groups (id) on delete cascade,
  name text not null,
  price_delta integer not null default 0,
  sort_order integer not null default 0
);
create index option_values_group_id_idx on public.option_values (option_group_id, sort_order);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  order_number integer not null,
  customer_name text not null,
  customer_phone text not null,
  fulfillment text not null check (fulfillment in ('delivery', 'pickup')),
  delivery_area text,
  address text,
  lat double precision,
  lng double precision,
  note text,
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  total integer not null check (total >= 0),
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  status text not null default 'new'
    check (status in ('new', 'preparing', 'out_for_delivery', 'delivered', 'rejected')),
  whatsapp_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, order_number)
);
create index orders_shop_created_idx on public.orders (shop_id, created_at desc);
create index orders_shop_status_idx on public.orders (shop_id, status);
create index orders_created_idx on public.orders (created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  quantity numeric(8, 2) not null check (quantity > 0),
  unit text not null default 'piece' check (unit in ('piece', 'kg', 'dozen', 'box')),
  unit_price integer not null,
  options jsonb not null default '[]'::jsonb,
  note text,
  line_total integer not null
);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  amount integer not null check (amount > 0),
  method text not null check (method in ('cash', 'jazzcash', 'easypaisa', 'bank')),
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  note text,
  recorded_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index subscription_payments_shop_idx on public.subscription_payments (shop_id, created_at desc);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  actor_role text,
  -- No FK: entries must survive (and be written during) deletion of the shop.
  shop_id uuid,
  action text not null,
  entity text,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_shop_idx on public.audit_log (shop_id, created_at desc);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- items: { "categories": [{ "name": "Cakes", "products": [{ "name", "description", "base_price",
--   "unit", "qty_step", "option_groups": [{ "name", "type", "is_required", "min_select",
--   "max_select", "values": [{ "name", "price_delta" }] }] }] }] }
create table public.menu_templates (
  id uuid primary key default gen_random_uuid(),
  business_type text not null
    check (business_type in ('restaurant', 'bakery', 'home_kitchen', 'grocery', 'pharmacy', 'clothing', 'other')),
  name text not null,
  items jsonb not null default '{"categories": []}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.shop_requests (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null,
  shop_name text not null,
  business_type text not null default 'other'
    check (business_type in ('restaurant', 'bakery', 'home_kitchen', 'grocery', 'pharmacy', 'clothing', 'other')),
  city text,
  area text,
  whatsapp_number text not null,
  preferred_time text,
  source text not null default 'website_form'
    check (source in ('website_form', 'whatsapp', 'in_person', 'referral')),
  status text not null default 'new'
    check (status in ('new', 'contacted', 'visit_scheduled', 'registered', 'not_interested')),
  notes text,
  follow_up_at timestamptz,
  converted_shop_id uuid references public.shops (id) on delete set null,
  -- Salted hash of the submitter's IP, used only for rate limiting.
  ip_hash text,
  created_at timestamptz not null default now()
);
create index shop_requests_status_idx on public.shop_requests (status, created_at desc);
create index shop_requests_ip_idx on public.shop_requests (ip_hash, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so policies don't recurse through RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.platform_role = 'super_admin'
  );
$$;

-- Any member of the shop (owner or staff).
create or replace function public.is_shop_member(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members m
    where m.shop_id = p_shop_id and m.user_id = (select auth.uid())
  );
$$;

-- Owner-level member: may manage menu and settings.
create or replace function public.is_shop_owner(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members m
    where m.shop_id = p_shop_id and m.user_id = (select auth.uid()) and m.role = 'owner'
  );
$$;

-- Shops whose menu is publicly visible and orderable.
create or replace function public.shop_is_public(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shops s
    where s.id = p_shop_id and s.status in ('trial', 'active', 'payment_due')
  );
$$;

create or replace function public.product_shop_id(p_product_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select shop_id from public.products where id = p_product_id;
$$;

create or replace function public.option_group_shop_id(p_group_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.shop_id from public.option_groups g
  join public.products p on p.id = g.product_id
  where g.id = p_group_id;
$$;

-- Lets the shop page say "not taking orders right now" for suspended shops
-- without making suspended/setup shops publicly readable.
create or replace function public.shop_public_status(p_slug text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select status from public.shops where slug = p_slug;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_touch_updated_at
before update on public.orders
for each row execute function public.touch_updated_at();

-- New auth user → profile row (name/phone from signup metadata).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'phone')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Nobody can change platform_role through the API (no self-promotion).
-- Roles are granted with SQL / the service key only.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.platform_role is distinct from old.platform_role
     and current_user in ('authenticated', 'anon') then
    raise exception 'platform_role cannot be changed';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

-- Shop owners may edit their shop's details, but not status, billing, slug or ownership.
create or replace function public.protect_shop_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_super_admin() then
    if new.owner_id is distinct from old.owner_id
       or new.slug is distinct from old.slug
       or new.status is distinct from old.status
       or new.plan is distinct from old.plan
       or new.monthly_fee is distinct from old.monthly_fee
       or new.paid_until is distinct from old.paid_until
       or new.onboarding_step is distinct from old.onboarding_step
       or new.qr_placed_at is distinct from old.qr_placed_at
       or new.went_live_at is distinct from old.went_live_at
       or new.created_by is distinct from old.created_by
       or new.next_order_number is distinct from old.next_order_number
       or new.created_at is distinct from old.created_at then
      raise exception 'Only a super admin can change these shop fields';
    end if;
  end if;
  return new;
end;
$$;

create trigger shops_protect_columns
before update on public.shops
for each row execute function public.protect_shop_columns();

-- Audit: every write a super admin makes through their own session is logged.
-- (Writes made with the service key are logged by the app via lib/audit.ts.)
create or replace function public.audit_super_admin_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_shop_id uuid;
  v_entity text;
begin
  if current_user <> 'authenticated' or not public.is_super_admin() then
    return null;
  end if;

  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_entity := case tg_table_name
    when 'shops' then 'shop'
    when 'categories' then 'category'
    when 'products' then 'product'
    when 'option_groups' then 'option_group'
    when 'option_values' then 'option_value'
    when 'orders' then 'order'
    when 'shop_members' then 'shop_member'
    when 'subscription_payments' then 'payment'
    else tg_table_name
  end;

  v_shop_id := case tg_table_name
    when 'shops' then (v_row ->> 'id')::uuid
    when 'option_groups' then public.product_shop_id((v_row ->> 'product_id')::uuid)
    when 'option_values' then public.option_group_shop_id((v_row ->> 'option_group_id')::uuid)
    else (v_row ->> 'shop_id')::uuid
  end;

  insert into public.audit_log (actor_id, actor_role, shop_id, action, entity, entity_id, before, after)
  values (
    auth.uid(),
    'super_admin',
    v_shop_id,
    v_entity || '.' || lower(tg_op),
    v_entity,
    coalesce(v_row ->> 'id', v_row ->> 'user_id'),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

create trigger audit_shops after insert or update or delete on public.shops
  for each row execute function public.audit_super_admin_write();
create trigger audit_shop_members after insert or update or delete on public.shop_members
  for each row execute function public.audit_super_admin_write();
create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function public.audit_super_admin_write();
create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.audit_super_admin_write();
create trigger audit_option_groups after insert or update or delete on public.option_groups
  for each row execute function public.audit_super_admin_write();
create trigger audit_option_values after insert or update or delete on public.option_values
  for each row execute function public.audit_super_admin_write();
create trigger audit_orders after update or delete on public.orders
  for each row execute function public.audit_super_admin_write();
create trigger audit_subscription_payments after insert or update or delete on public.subscription_payments
  for each row execute function public.audit_super_admin_write();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.option_groups enable row level security;
alter table public.option_values enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.audit_log enable row level security;
alter table public.menu_templates enable row level security;
alter table public.shop_requests enable row level security;

-- profiles
create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_super_admin());
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_super_admin())
  with check (id = (select auth.uid()) or public.is_super_admin());

-- shops
create policy "Public reads live shops" on public.shops
  for select to anon, authenticated
  using (status in ('trial', 'active', 'payment_due'));
create policy "Members and admins read shops" on public.shops
  for select to authenticated
  using (public.is_shop_member(id) or public.is_super_admin());
create policy "Super admins insert shops" on public.shops
  for insert to authenticated with check (public.is_super_admin());
create policy "Owners and admins update shops" on public.shops
  for update to authenticated
  using (public.is_shop_owner(id) or public.is_super_admin())
  with check (public.is_shop_owner(id) or public.is_super_admin());
create policy "Super admins delete shops" on public.shops
  for delete to authenticated using (public.is_super_admin());

-- Anonymous visitors only see the columns the shop page needs (no billing fields).
revoke select on public.shops from anon;
grant select (id, slug, name, city, area, whatsapp_number, logo_url, cover_color, business_type,
              delivery_fee, delivery_areas, min_order, pickup_enabled, is_open, opening_hours, status)
  on public.shops to anon;

-- shop_members
create policy "Members read own memberships" on public.shop_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_super_admin());
create policy "Super admins manage members" on public.shop_members
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Menu: public read for live shops; members and admins always; owners and admins write.
create policy "Read categories" on public.categories
  for select to anon, authenticated
  using (public.shop_is_public(shop_id) or public.is_shop_member(shop_id) or public.is_super_admin());
create policy "Owners write categories" on public.categories
  for all to authenticated
  using (public.is_shop_owner(shop_id) or public.is_super_admin())
  with check (public.is_shop_owner(shop_id) or public.is_super_admin());

create policy "Read products" on public.products
  for select to anon, authenticated
  using (public.shop_is_public(shop_id) or public.is_shop_member(shop_id) or public.is_super_admin());
create policy "Owners write products" on public.products
  for all to authenticated
  using (public.is_shop_owner(shop_id) or public.is_super_admin())
  with check (public.is_shop_owner(shop_id) or public.is_super_admin());

create policy "Read option groups" on public.option_groups
  for select to anon, authenticated
  using (
    public.shop_is_public(public.product_shop_id(product_id))
    or public.is_shop_member(public.product_shop_id(product_id))
    or public.is_super_admin()
  );
create policy "Owners write option groups" on public.option_groups
  for all to authenticated
  using (public.is_shop_owner(public.product_shop_id(product_id)) or public.is_super_admin())
  with check (public.is_shop_owner(public.product_shop_id(product_id)) or public.is_super_admin());

create policy "Read option values" on public.option_values
  for select to anon, authenticated
  using (
    public.shop_is_public(public.option_group_shop_id(option_group_id))
    or public.is_shop_member(public.option_group_shop_id(option_group_id))
    or public.is_super_admin()
  );
create policy "Owners write option values" on public.option_values
  for all to authenticated
  using (public.is_shop_owner(public.option_group_shop_id(option_group_id)) or public.is_super_admin())
  with check (public.is_shop_owner(public.option_group_shop_id(option_group_id)) or public.is_super_admin());

-- Orders: members and admins read + update. No insert policy:
-- orders are only created through public.place_order().
create policy "Members read orders" on public.orders
  for select to authenticated
  using (public.is_shop_member(shop_id) or public.is_super_admin());
create policy "Members update orders" on public.orders
  for update to authenticated
  using (public.is_shop_member(shop_id) or public.is_super_admin())
  with check (public.is_shop_member(shop_id) or public.is_super_admin());

create policy "Members read order items" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (public.is_shop_member(o.shop_id) or public.is_super_admin())
  ));
create policy "Members update order items" on public.order_items
  for update to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (public.is_shop_member(o.shop_id) or public.is_super_admin())
  ));

-- Only workflow fields of an order can change; never the number, totals or shop.
revoke update on public.orders from authenticated;
grant update (status, whatsapp_confirmed, note) on public.orders to authenticated;
revoke update on public.order_items from authenticated;
grant update (note) on public.order_items to authenticated;

-- Billing, audit, templates, leads
create policy "Super admins manage payments" on public.subscription_payments
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Super admins read audit log" on public.audit_log
  for select to authenticated using (public.is_super_admin());
-- No insert policy: rows come from the audit trigger or server code (service key).

create policy "Signed-in users read menu templates" on public.menu_templates
  for select to authenticated using (true);
create policy "Super admins manage menu templates" on public.menu_templates
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- No public access at all. Website submissions are inserted by a Server Action with the service key.
create policy "Super admins manage shop requests" on public.shop_requests
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- place_order: validates the cart, recalculates every price from the database,
-- assigns the per-shop order number and inserts order + item snapshots.
--
-- p_items: [{ "product_id": uuid, "quantity": number,
--             "option_value_ids": [uuid], "texts": [{ "group_id": uuid, "text": string }],
--             "note": string }]
-- ---------------------------------------------------------------------------

create or replace function public.place_order(
  p_shop_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_fulfillment text,
  p_delivery_area text,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_note text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop public.shops%rowtype;
  v_order_id uuid;
  v_order_number integer;
  v_subtotal integer := 0;
  v_delivery_fee integer := 0;
  v_area text;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric;
  v_value_ids uuid[];
  v_unit_price integer;
  v_line_total integer;
  v_options jsonb;
  v_group record;
  v_selected_count integer;
  v_text text;
  v_snapshots jsonb := '[]'::jsonb;
  v_snap jsonb;
begin
  -- Lock the shop row: serialises order numbers per shop.
  select * into v_shop from public.shops where id = p_shop_id for update;
  if not found then
    raise exception 'SHOP_NOT_FOUND';
  end if;
  if v_shop.status not in ('trial', 'active', 'payment_due') or not v_shop.is_open then
    raise exception 'SHOP_CLOSED';
  end if;

  if coalesce(trim(p_customer_name), '') = '' then
    raise exception 'NAME_REQUIRED';
  end if;
  if coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'PHONE_REQUIRED';
  end if;
  if p_fulfillment not in ('delivery', 'pickup') then
    raise exception 'INVALID_FULFILLMENT';
  end if;
  if p_fulfillment = 'pickup' and not v_shop.pickup_enabled then
    raise exception 'PICKUP_DISABLED';
  end if;
  if p_fulfillment = 'delivery' and coalesce(trim(p_address), '') = '' then
    raise exception 'ADDRESS_REQUIRED';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'CART_TOO_LARGE';
  end if;

  -- Delivery fee: per-area when the shop lists areas, otherwise the flat fee.
  if p_fulfillment = 'delivery' then
    if jsonb_array_length(v_shop.delivery_areas) > 0 then
      select a ->> 'name', (a ->> 'fee')::integer
        into v_area, v_delivery_fee
      from jsonb_array_elements(v_shop.delivery_areas) a
      where lower(a ->> 'name') = lower(trim(coalesce(p_delivery_area, '')))
      limit 1;
      if v_area is null then
        raise exception 'INVALID_DELIVERY_AREA';
      end if;
    else
      v_delivery_fee := v_shop.delivery_fee;
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid and shop_id = p_shop_id;
    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;
    if not v_product.is_available then
      raise exception 'PRODUCT_UNAVAILABLE:%', v_product.name;
    end if;

    v_qty := (v_item ->> 'quantity')::numeric;
    if v_qty is null or v_qty <= 0 or v_qty > 1000 then
      raise exception 'INVALID_QUANTITY';
    end if;
    -- quantity must be a multiple of the product's step (e.g. 0.5 kg)
    if mod(v_qty, v_product.qty_step) <> 0 then
      raise exception 'INVALID_QUANTITY';
    end if;

    select coalesce(array_agg(x::uuid), '{}')
      into v_value_ids
    from jsonb_array_elements_text(coalesce(v_item -> 'option_value_ids', '[]'::jsonb)) x;

    -- Every chosen value must belong to this product.
    if exists (
      select 1 from unnest(v_value_ids) vid
      where not exists (
        select 1 from public.option_values ov
        join public.option_groups og on og.id = ov.option_group_id
        where ov.id = vid and og.product_id = v_product.id and og.type <> 'text'
      )
    ) then
      raise exception 'INVALID_OPTION';
    end if;

    v_unit_price := v_product.base_price;
    v_options := '[]'::jsonb;

    for v_group in
      select * from public.option_groups
      where product_id = v_product.id
      order by sort_order, name
    loop
      if v_group.type = 'text' then
        v_text := null;
        select left(trim(t ->> 'text'), 200) into v_text
        from jsonb_array_elements(coalesce(v_item -> 'texts', '[]'::jsonb)) t
        where (t ->> 'group_id')::uuid = v_group.id
        limit 1;
        if coalesce(v_text, '') = '' then
          if v_group.is_required then
            raise exception 'OPTION_REQUIRED:%', v_group.name;
          end if;
        else
          v_options := v_options || jsonb_build_array(
            jsonb_build_object('group', v_group.name, 'choice', v_text, 'price', 0));
        end if;
      else
        select count(*) into v_selected_count
        from public.option_values ov
        where ov.option_group_id = v_group.id and ov.id = any (v_value_ids);

        if v_group.type = 'single' and v_selected_count > 1 then
          raise exception 'TOO_MANY_OPTIONS:%', v_group.name;
        end if;
        if (v_group.is_required and v_selected_count = 0)
           or v_selected_count < v_group.min_select then
          raise exception 'OPTION_REQUIRED:%', v_group.name;
        end if;
        if v_group.max_select is not null and v_selected_count > v_group.max_select then
          raise exception 'TOO_MANY_OPTIONS:%', v_group.name;
        end if;

        select v_unit_price + coalesce(sum(ov.price_delta), 0),
               v_options || coalesce(jsonb_agg(
                 jsonb_build_object('group', v_group.name, 'choice', ov.name, 'price', ov.price_delta)
                 order by ov.sort_order, ov.name), '[]'::jsonb)
          into v_unit_price, v_options
        from public.option_values ov
        where ov.option_group_id = v_group.id and ov.id = any (v_value_ids);
      end if;
    end loop;

    if v_unit_price < 0 then
      v_unit_price := 0;
    end if;
    v_line_total := round(v_unit_price * v_qty)::integer;
    v_subtotal := v_subtotal + v_line_total;

    v_snapshots := v_snapshots || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'quantity', v_qty,
      'unit', v_product.unit,
      'unit_price', v_unit_price,
      'options', v_options,
      'note', nullif(left(trim(coalesce(v_item ->> 'note', '')), 300), ''),
      'line_total', v_line_total
    ));
  end loop;

  if v_subtotal < v_shop.min_order then
    raise exception 'BELOW_MIN_ORDER:%', v_shop.min_order;
  end if;

  v_order_number := v_shop.next_order_number;
  update public.shops set next_order_number = next_order_number + 1 where id = p_shop_id;

  insert into public.orders (
    shop_id, order_number, customer_name, customer_phone, fulfillment, delivery_area,
    address, lat, lng, note, subtotal, delivery_fee, total
  ) values (
    p_shop_id, v_order_number, left(trim(p_customer_name), 100), left(trim(p_customer_phone), 20),
    p_fulfillment,
    case when p_fulfillment = 'delivery' then v_area end,
    case when p_fulfillment = 'delivery' then left(trim(p_address), 500) end,
    case when p_fulfillment = 'delivery' then p_lat end,
    case when p_fulfillment = 'delivery' then p_lng end,
    nullif(left(trim(coalesce(p_note, '')), 500), ''),
    v_subtotal, v_delivery_fee, v_subtotal + v_delivery_fee
  )
  returning id into v_order_id;

  for v_snap in select * from jsonb_array_elements(v_snapshots) loop
    insert into public.order_items (
      order_id, product_id, product_name, quantity, unit, unit_price, options, note, line_total
    ) values (
      v_order_id,
      (v_snap ->> 'product_id')::uuid,
      v_snap ->> 'product_name',
      (v_snap ->> 'quantity')::numeric,
      v_snap ->> 'unit',
      (v_snap ->> 'unit_price')::integer,
      v_snap -> 'options',
      v_snap ->> 'note',
      (v_snap ->> 'line_total')::integer
    );
  end loop;

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'total', v_subtotal + v_delivery_fee
  );
end;
$$;

revoke all on function public.place_order(uuid, text, text, text, text, text, double precision, double precision, text, jsonb) from public;
grant execute on function public.place_order(uuid, text, text, text, text, text, double precision, double precision, text, jsonb) to anon, authenticated, service_role;

-- get_public_order: the customer's "order sent" page. The order id is an
-- unguessable UUID that only the customer who placed the order receives.
create or replace function public.get_public_order(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'fulfillment', o.fulfillment,
    'delivery_area', o.delivery_area,
    'address', o.address,
    'lat', o.lat,
    'lng', o.lng,
    'note', o.note,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'status', o.status,
    'created_at', o.created_at,
    'shop', jsonb_build_object(
      'id', s.id, 'slug', s.slug, 'name', s.name, 'area', s.area,
      'whatsapp_number', s.whatsapp_number, 'logo_url', s.logo_url, 'cover_color', s.cover_color
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name, 'quantity', i.quantity, 'unit', i.unit,
        'unit_price', i.unit_price, 'options', i.options, 'note', i.note, 'line_total', i.line_total
      ) order by i.id)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  join public.shops s on s.id = o.shop_id
  where o.id = p_order_id;
$$;

revoke all on function public.get_public_order(uuid) from public;
grant execute on function public.get_public_order(uuid) to anon, authenticated, service_role;

revoke all on function public.shop_public_status(text) from public;
grant execute on function public.shop_public_status(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime: dashboard listens for orders, admin panel for new shop requests (RLS applies).
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.shop_requests;

-- ---------------------------------------------------------------------------
-- Storage: product photos and shop logos. Public read; owners (and super admins)
-- write only under <shop_id>/.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.can_write_shop_folder(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid;
begin
  begin
    v_shop_id := ((storage.foldername(p_name))[1])::uuid;
  exception when others then
    return false;
  end;
  return public.is_shop_owner(v_shop_id) or public.is_super_admin();
end;
$$;

create policy "Public read product photos" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-photos');

create policy "Owners upload product photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-photos' and public.can_write_shop_folder(name));

create policy "Owners update product photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-photos' and public.can_write_shop_folder(name));

create policy "Owners delete product photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-photos' and public.can_write_shop_folder(name));
