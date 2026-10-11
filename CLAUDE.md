# Dukaan — WhatsApp ordering system for Pakistani shops

## What we're building
A multi-tenant web app that lets small Pakistani businesses (restaurants, home kitchens, bakeries,
grocery/kiryana stores, pharmacies) take orders through a shop link, with orders delivered to the
shop's WhatsApp. "Dukaan" is a placeholder brand name. Example shop used in designs: "Ali Bakers & Sweets",
Satellite Town, Rawalpindi.

Three parts:
1. **Customer shop site** — `/[slug]` (e.g. `/ali-bakers`). No account needed. Browse menu → choose options →
   checkout → order is saved → WhatsApp opens with a prefilled order message → customer taps Send.
2. **Shopkeeper dashboard** — `/dashboard`, installable as a PWA. Orders, order details, menu, add/edit product, sales.
3. **Super admin panel** — `/admin`, for me (the platform owner) and my team. Access to ALL shops: register new shops,
   create owner logins, set up menus and products on the shop's behalf, manage subscriptions, and open any shop's
   dashboard ("View as shopkeeper"). See "Roles and permissions" and "Super admin flows" below.
4. **Marketing site + shop requests** — `/` (homepage for shopkeepers): what Dukaan does, demo shop link, pricing,
   "Register your shop" form, and a "Message us on WhatsApp" button. Requests appear in the super admin panel.
   See "Shop requests (leads)" below.

## Tech stack
- Next.js (App Router), JavaScript or TypeScript, Tailwind CSS
- Supabase: Postgres, Auth, Storage, Realtime. Packages: `@supabase/supabase-js`, `@supabase/ssr`
- Project was started from the `with-supabase` template (browser + server clients and auth proxy already exist in `lib/supabase/`)
- Hosting: Vercel. Code on GitHub.
- PWA for the dashboard (manifest + service worker), installable on Android home screen

## Key decisions (do not change without asking)
- **WhatsApp via click-to-chat links first** (`https://wa.me/<number>?text=<encoded>`), NOT the WhatsApp Cloud API.
  The Cloud API is a later premium feature (per-message cost).
- **Save the order in the database BEFORE opening WhatsApp.** Some customers never press Send; the order must
  still appear on the dashboard.
- **Never trust prices from the browser.** Server Actions recalculate totals from the database.
- **Order items store a snapshot** of product name, chosen options and prices (JSON), so later menu changes
  don't alter old orders or reports.
- **One app, many shops** (multi-tenant). Shop is resolved from the URL slug.
- **Security = Row Level Security (RLS)** on every table. Publishable key in the browser; secret key ONLY in
  server code (Server Actions / route handlers), never in client components.
- **Mobile-first and responsive.** Mobile layout below 768px (`md` breakpoint), desktop layouts above
  (customer: sidebar categories + product grid + cart panel; dashboard: left sidebar + multi-column).
- **English + Urdu.** Language toggle on customer site. Urdu uses `dir="rtl"` and the Noto Nastaliq Urdu font.
- Money is stored as integer rupees (PKR). Display format: `Rs 2,980`; large numbers may use lakh format (`Rs 1,48,600`).
- Phone numbers for wa.me must be in international format without `+` or leading 0: `923001234567`.
- Payment for MVP: cash on delivery only.

## Roles and permissions
| Role | Who | Can do |
|---|---|---|
| `super_admin` | Platform owner (me) | Everything, across all shops: create/edit/suspend shops, create owner accounts, manage any menu, see all orders and sales, billing, users & roles, activity log |
| `support` (later) | My team members | Like super_admin but cannot delete shops, change roles or billing |
| `shop_owner` | The shopkeeper | Only their own shop: orders, menu, sales, shop settings |
| `shop_staff` (later) | Shop employees | Only their shop's orders (accept / update status); no menu, sales or settings |
| Customer | Anyone | No account. Browse menus and place orders through the server action |

Rules:
- Role checks happen on the SERVER (layout/route guards + RLS). Hiding buttons in the UI is not security.
- `/admin/*` routes: server-side check that the user is a super_admin; otherwise redirect.
- `/dashboard/*` routes: user must be a member of the shop (or a super_admin).
- Super admins should use two-factor authentication (Supabase MFA / TOTP).
- Every write a super_admin makes to a shop's data is recorded in `audit_log`.

## Super admin flows
**Shops list (admin home, `/admin/shops`)**: stats (live shops, orders today across all shops, setup in progress,
monthly subscription income + payments due); filter chips by status (All, Active, Trial, Setup, Payment due,
Suspended), city filter, search by shop/owner/phone; table: shop (logo, name, slug), owner (name, phone), type,
area, product count, orders (30 days), status, actions ("Manage" or "Continue setup"). Buttons: "+ Register new shop",
"Import shops (CSV)".

**Register new shop wizard (`/admin/shops/new`)**, 5 steps, saveable as draft (shop status = `setup`):
1. Shop details: name, slug with live availability check, business type (loads option templates), WhatsApp number,
   city, area/address, logo (or initials), brand colour. Live preview of the shop header on the right.
2. Owner account: owner name, phone, email (optional); create login and send an invite (see open decision below).
3. Delivery & hours: delivery areas and fees, minimum order, pickup on/off, opening hours per day.
4. Menu & products: three ways — start from the business-type template (e.g. Bakery starter menu), import a
   spreadsheet (CSV: name, category, price, unit, description), or add one by one. Editable quick-add table.
   Shows a summary (products, categories, missing photos).
5. Review & go live: checklist, generate shop link + printable QR code (PDF), set status to `trial` or `active`.
The wizard must also work on a phone, because shops are often registered in person at the counter.

**Shop detail (`/admin/shops/[id]`)**: header with status and actions (Open shop page, View as shopkeeper);
tabs: Overview, Menu, Orders, Owner & access, Billing, Activity log. Overview shows 30-day orders/sales, product
count, owner's last login, a setup checklist (details, owner account, delivery, menu, photos x of y, QR code placed,
first order received), owner card (reset password, resend login link), subscription card (plan, paid until, record
payment), danger zone (suspend shop).

**View as shopkeeper**: opens the normal shopkeeper dashboard for that shop with a permanent banner:
"Super admin mode — viewing <shop> as the shopkeeper. Changes are logged. [Exit to admin]".
Implement as the admin's OWN session with a selected shop context (e.g. `/dashboard?shop=<id>` allowed only for
super_admin), NOT by logging in as the owner. All writes go to `audit_log` with the admin's user id.

**Suspend shop**: shop page shows "This shop is not taking orders right now"; owner can log in but sees a notice.

## Shop requests (leads)
- Homepage form fields (keep it under a minute): owner name, shop name, business type, city, area,
  WhatsApp number, preferred time to call. Line under the form: "We'll only use your number to contact you
  about registering your shop."
- Next to the form: "Prefer WhatsApp? Message us" button → wa.me link to the platform's WhatsApp number with
  prefilled text "Assalam-o-Alaikum, I want to register my shop on Dukaan."
- Submission goes through a Server Action (never a direct browser insert): validate, save to `shop_requests`,
  then notify me by email (Resend) and via a realtime "New request" badge in the admin panel.
- Spam protection: hidden honeypot field, rate limit per IP/device, optional Cloudflare Turnstile.
- Admin section `/admin/requests`: list with status (new | contacted | visit_scheduled | registered |
  not_interested), notes, follow-up date, Call and WhatsApp buttons, "Add request manually" (for leads that
  came via WhatsApp or in person), and "Convert to shop" which opens the register wizard prefilled and links
  the request to the new shop.
- Homepage is public and should be fast and SEO-friendly (Server Components), English + Urdu.

## Data model (Supabase / Postgres)
- `profiles`: id (= auth.users.id), full_name, phone, platform_role (super_admin | support | null), created_at
- `shops`: id, owner_id (auth.users), slug (unique), name, city, area, whatsapp_number, logo_url, cover_color,
  business_type (restaurant | bakery | home_kitchen | grocery | pharmacy | clothing | other), delivery_fee,
  delivery_areas (jsonb [{name, fee}], empty = flat delivery_fee), min_order,
  pickup_enabled, is_open, opening_hours (jsonb {prep_time, days: {mon: {open, close, closed}, …}}),
  status (setup | trial | active | payment_due | suspended), plan (e.g. 'standard'), monthly_fee, paid_until,
  onboarding_step (1–5), created_by (admin user id), created_at
- `shop_members`: shop_id, user_id, role (owner | staff), created_at — use this (not only owner_id) for access checks
- `subscription_payments`: id, shop_id, amount, method (cash | jazzcash | easypaisa | bank), period_start,
  period_end, recorded_by, created_at
- `audit_log`: id, actor_id, actor_role, shop_id, action (e.g. 'product.update'), entity, entity_id,
  before (jsonb), after (jsonb), created_at
- `menu_templates`: id, business_type, name, items (jsonb: categories, products, option groups) — e.g. "Bakery starter menu"
- `shop_requests`: id, owner_name, shop_name, business_type, city, area, whatsapp_number, preferred_time,
  source (website_form | whatsapp | in_person | referral), status (new | contacted | visit_scheduled | registered |
  not_interested), notes, follow_up_at, converted_shop_id, created_at. RLS: no public access at all; inserted by
  the Server Action, read/updated by super_admin only.
- `categories`: id, shop_id, name, sort_order
- `products`: id, shop_id, category_id, name, description, base_price, unit (piece | kg | dozen | box),
  qty_step (numeric, e.g. 0.5 for kg), photo_url, is_available, details (jsonb, info-only attributes), sort_order
- `option_groups`: id, product_id, name, type (single | multiple | text), is_required, min_select, max_select, sort_order
- `option_values`: id, option_group_id, name, price_delta (integer), sort_order
- `orders`: id, shop_id, order_number (per-shop sequence, shown as #1042), customer_name, customer_phone,
  fulfillment (delivery | pickup), delivery_area, address, lat, lng, note, subtotal, delivery_fee, total,
  payment_method ('cod'), status (new | preparing | out_for_delivery | delivered | rejected),
  whatsapp_confirmed (boolean, default false), created_at, updated_at
- `order_items`: id, order_id, product_id (nullable), product_name, quantity, unit (snapshot), unit_price,
  options (jsonb snapshot: [{group, choice, price}]), note, line_total
- Later (not MVP): `variants` per product for clothing (size × color with stock).

### RLS rules
- Create helper SQL functions: `is_super_admin()` (checks `profiles.platform_role = 'super_admin'` for `auth.uid()`)
  and `is_shop_member(shop_id)` (checks `shop_members`). Make them `SECURITY DEFINER` with a fixed `search_path`.
- Every policy below is `... OR is_super_admin()` so the super admin can access all shops.
- Public (anon) can SELECT shops with status trial/active/payment_due, plus their categories, products, options.
  Shops in `setup` or `suspended` are not publicly visible as orderable.
- Shop members (owner) can INSERT/UPDATE/DELETE their own shop's categories, products, options.
- Shop members can SELECT and UPDATE orders/order_items for their own shop only.
- Only super_admin can INSERT shops, change shop status/plan/billing fields, and read/write subscription_payments.
- `profiles.platform_role` can never be changed by the user themselves (no self-promotion to admin).
- `audit_log`: insert from server code; readable by super_admin (and later, a shop's own entries by its owner).
- Nobody inserts orders directly from the browser. Orders are created in a Server Action that validates the cart,
  recalculates prices from the DB, and inserts with the secret key (or via a SECURITY DEFINER database function).
- Storage bucket `product-photos`: public read; owners can write only under `<shop_id>/` folder.

### Open decision: "Unconfirmed" orders
With wa.me links we cannot detect whether the customer pressed Send. Proposed approach: orders start as `new`
with `whatsapp_confirmed = false`; the shopkeeper sees an "Unconfirmed" badge until they accept the order or mark
"received on WhatsApp". Ask before implementing anything different.

### Decided: how shop owners log in (2026-10-11)
Phone + password. The super admin sets a temporary password in the register wizard; the owner logs in with their
mobile number + password and must change it on first login (`user_metadata.must_change_password`). Supabase phone
sign-in needs a paid SMS provider, so each owner's login is an internal email derived from the phone
(`923001234567@phone.dukaan.invalid`, see `lib/login.ts`); no mail is sent to it. A real email, if any, is stored as
contact info only. Login details are sent to the owner with a wa.me link (no SMS). Super admins log in with email.
Creating users from the admin panel uses the Supabase admin API with the SECRET key in server code only.

## Product options model
Option groups handle ~90% of shops: single choice (size/weight), multiple choice (extras, with max),
text input (message on cake). Each choice can add to the price. Business-type templates pre-fill common groups
("+ Size", "+ Weight", "+ Flavour", "+ Extras" quick-start chips on the Add product screen).

## WhatsApp order message format
```
New Order #1042 – Ali Bakers

1x Chocolate Fudge Cake (2 lb, Birthday candles) – Rs 2,400
1x Chicken Patties – Rs 480

Delivery: Rs 100
Total: Rs 2,980

Name: Ayesha Khan
Phone: 0300 1234567
Address: House 12, Street 5, Satellite Town
Location: https://maps.google.com/?q=<lat>,<lng>
Payment: Cash on delivery
```
Status update buttons on the dashboard open wa.me links to the CUSTOMER's number with prefilled text
(e.g. "Your order #1042 is on the way").

## Designs (Figma)
File: https://www.figma.com/design/8ZCPnyUY5fXwY9F9VhLou1 (use the Figma MCP `get_design_context` with these node IDs)

Design system page:
- Foundations + components board: 3:25
- Components: Button 3:114 (Primary / Secondary / WhatsApp), Status badge 3:126, Option row 3:147,
  Input field 3:149, Product card 3:154, Order card 3:171, Bottom nav 5:110

Customer screens page:
- Mobile: Shop menu 4:4, Choose options 4:105, Checkout 4:172, Order sent 4:240
- Desktop: Shop menu 7:93, Options modal 7:270, Checkout 7:421, Order sent 7:517

Shopkeeper dashboard page:
- Mobile: Orders 5:111, Order details 5:219, Menu list 6:138, Add product 6:245, Edit product 5:282, Sales 5:384
- Desktop: Orders (list + detail side by side) 8:181, Menu table 8:392, Add product 8:623, Sales 8:780

Super admin screens: NOT yet in Figma. Follow the "Super admin flows" spec above, reusing the same components and
tokens. Admin sidebar uses `brand/primary` as its background (white text) so admin mode is visually distinct from
the shopkeeper dashboard (white sidebar).

### Design tokens (Figma variables "Dukaan colors")
brand/primary #0F5C4A · brand/primary-soft #E2EFE9 · brand/accent #E39B2D · brand/accent-soft #FBEFD9 ·
brand/whatsapp #15803D · surface/bg #F8F5EF · surface/card #FFFFFF · text/primary #1F1D1A ·
text/secondary #6B665D · text/inverse #FFFFFF · border/default #E6DFD2 · feedback/danger #B42318
Status badges: new #FCEFD6/#8A5A0F · preparing #E3EDFA/#1E4C86 · out #EEE7FA/#5A3896 ·
delivered #E1F1E5/#22663A · unconfirmed #EEECE7/#5C5850
Fonts: Plus Jakarta Sans (UI), Noto Nastaliq Urdu (Urdu). Radius: 12–16px cards, 14px buttons, pill chips.
Map these to Tailwind theme colors with the same names.

## MVP scope
In: super admin (shops list, register-shop wizard, menu templates + CSV import, shop detail, view as shopkeeper,
record subscription payments, audit log), customer ordering flow, shopkeeper login, orders dashboard with realtime
new-order alert + sound, order status updates, menu/product management with option groups, product photos,
sales summary, PWA install, English/Urdu toggle.
Out (later): WhatsApp Cloud API automation, online payments (JazzCash/Easypaisa), variants with stock,
discount codes, inventory, bill/photo scanning.

## Build order
1. Tailwind theme tokens + fonts + base components (Button, Badge, Input, OptionRow, ProductCard, OrderCard)
2. Database migration SQL (all tables incl. profiles, shop_members, audit_log; helper functions; RLS policies;
   storage bucket) + seed data (my super_admin profile, Ali Bakers shop, Bakery menu template)
3. Auth + role guards: login page, `/admin` guard (super_admin only), `/dashboard` guard (shop member or super_admin)
4. Super admin: shops list → register-shop wizard (steps 1–5, draft saving) → menu setup (template, CSV import,
   quick-add table) → shop detail page → audit logging
5. Customer shop page `/[slug]` (Server Component) → options sheet/modal → cart (client state) → checkout
6. `placeOrder` Server Action (validate, recalc, insert order + items, return wa.me URL) → order sent page
7. Shopkeeper dashboard: orders list with Supabase Realtime + order details + status updates;
   "View as shopkeeper" banner mode for super_admin
8. Menu list, add/edit product, option groups editor, photo upload
9. Sales summary, subscription payments, PWA manifest + service worker
10. Marketing homepage with "Register your shop" form + WhatsApp button, email notification (Resend),
    `/admin/requests` leads list with "Convert to shop"

## Conventions
- Server Components by default; `"use client"` only where needed (cart, realtime, forms).
- Mutations via Server Actions. Validate input on the server (e.g. zod).
- Keep the secret Supabase key in `SUPABASE_SECRET_KEY` (no NEXT_PUBLIC_ prefix).
- Write SQL migrations as files in `supabase/migrations/`.
- Ask before adding new paid services or changing key decisions above.
