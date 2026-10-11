# Dukaan

WhatsApp ordering for small Pakistani shops. Customers order from a shop link (`/ali-bakers`),
the order is saved, and WhatsApp opens with the order message prefilled. Shopkeepers manage
orders and their menu from an installable dashboard (`/dashboard`). The platform team registers
and manages shops from the super admin panel (`/admin`). Shopkeepers can request a shop from the
homepage (`/`).

See [CLAUDE.md](CLAUDE.md) for the product spec and key decisions.

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres, Auth, Storage, Realtime) · Vercel

## Setup

1. **Install**

   ```bash
   npm install
   ```

2. **Environment** — copy `.env.example` to `.env.local` and fill in:

   | Variable | Used for |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server (RLS applies) |
   | `SUPABASE_SECRET_KEY` | server only — creating owner logins, website shop requests, audit entries |
   | `NEXT_PUBLIC_PLATFORM_WHATSAPP` | "Message us on WhatsApp" on the homepage (`923001234567` format) |
   | `RESEND_API_KEY`, `REQUEST_NOTIFY_EMAIL`, `RESEND_FROM` | optional email alert for new shop requests |
   | `REQUEST_IP_SALT` | any random string; hashes IPs for request rate limiting |
   | `NEXT_PUBLIC_PHONE_LOGIN_DOMAIN` | only if Supabase rejects the default phone-login domain (see below) |

3. **Database** — in the Supabase SQL editor (or with the Supabase CLI) run
   [`supabase/migrations/20261011000000_init.sql`](supabase/migrations/20261011000000_init.sql).
   It creates all tables, helper functions, RLS policies, the audit trigger, the order functions,
   realtime publication entries and the `product-photos` storage bucket.

4. **Super admin**
   1. Sign up at `/auth/sign-up` with `irrfankhanktk@gmail.com` and confirm the email.
   2. Run [`supabase/seed.sql`](supabase/seed.sql). It promotes that account to `super_admin` and adds
      the Ali Bakers demo shop and starter menu templates. It is safe to re-run.
   3. Log in, open `/admin/security` and turn on two-step verification (authenticator app — free).

5. **Run**

   ```bash
   npm run dev
   ```

   | | |
   | --- | --- |
   | Homepage + shop requests | http://localhost:3000 |
   | Demo shop | http://localhost:3000/ali-bakers |
   | Super admin | http://localhost:3000/admin |
   | Shopkeeper dashboard | http://localhost:3000/dashboard |

## Roles

| Role | How they get access |
| --- | --- |
| `super_admin` | `profiles.platform_role = 'super_admin'` (set with SQL only — nobody can promote themselves) |
| `shop_owner` | row in `shop_members` with role `owner`, created by the register wizard |
| customer | no account |

Super admins can open any shop's dashboard with **View as shopkeeper**: they keep their own session,
a banner shows they are in admin mode, and every change is written to `audit_log` with their user id.

## Shop owner logins

Owners log in with their **mobile number + password**. In wizard step 2 the admin sets a temporary
password and sends the login details to the owner on WhatsApp; the owner must choose a new password
on first login. Because Supabase phone sign-in requires a paid SMS provider, each owner's login is an
internal email derived from the phone number (`923001234567@phone.dukaan.invalid`); no mail is ever
sent to it. If your Supabase project rejects that address, set `NEXT_PUBLIC_PHONE_LOGIN_DOMAIN` to a
subdomain you control that receives no mail.

Forgotten passwords: the admin resets them from the shop's **Owner & access** tab.

## How ordering works

1. The customer builds a cart in the browser (prices there are for display only).
2. `placeOrder` (Server Action) validates input and calls the `place_order` database function, which
   re-reads every price from the database, checks options, availability, minimum order, pickup and
   delivery area, assigns the next per-shop order number and stores the order with item snapshots.
3. Only then does the browser open `https://wa.me/<shop number>?text=<order message>`. If the customer
   never presses Send, the order still shows on the dashboard as **Unconfirmed**.
4. The dashboard receives new orders through Supabase Realtime and plays an alert sound.

Only shops with status `trial`, `active` or `payment_due` are public and take orders. `setup` shops are
hidden; `suspended` shops show "This shop is not taking orders right now".

## Project layout

```
app/                   homepage (/), robots, sitemap, manifest
app/[slug]/            customer shop, checkout, order-sent page, placeOrder action
app/dashboard/         shopkeeper dashboard (orders, menu, sales, settings)
app/admin/             super admin (shops, register wizard, requests, activity, security)
app/actions/           shared server actions (view-as, shop requests)
app/auth/              login (phone or email), first-login password change, MFA
components/ui/         design-system components
lib/                   types, formatting, hours, WhatsApp message builder, auth/roles, owners, audit
supabase/migrations/   SQL migrations
supabase/seed.sql      super admin, demo shop, menu templates
public/sw.js           service worker for the installable dashboard
```
