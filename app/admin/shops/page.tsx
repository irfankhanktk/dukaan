import Link from "next/link";
import Form from "next/form";
import { Plus, Search, Upload } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { formatPhone, formatRs, startOfPkDay, toWhatsAppNumber } from "@/lib/format";
import { BUSINESS_TYPE_LABELS } from "@/lib/menu-import";
import type { BusinessType, ShopStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopAvatar } from "@/components/ui/product-image";

export const metadata = { title: "Shops" };

type Row = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  area: string | null;
  logo_url: string | null;
  business_type: BusinessType;
  status: ShopStatus;
  monthly_fee: number;
  paid_until: string | null;
  onboarding_step: number;
  created_at: string;
  products: { count: number }[];
  orders: { count: number }[];
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "trial", label: "Trial" },
  { key: "setup", label: "Setup" },
  { key: "payment_due", label: "Payment due" },
  { key: "suspended", label: "Suspended" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const SHOP_STATUS_LABELS: Record<ShopStatus, string> = {
  setup: "Setup",
  trial: "Trial",
  active: "Active",
  payment_due: "Payment due",
  suspended: "Suspended",
};

const STATUS_VARIANT: Record<ShopStatus, BadgeProps["variant"]> = {
  setup: "unconfirmed",
  trial: "preparing",
  active: "delivered",
  payment_due: "new",
  suspended: "rejected",
};

function ShopStatusBadge({ status, overdue }: { status: ShopStatus; overdue: boolean }) {
  if (overdue && status !== "payment_due" && status !== "suspended" && status !== "setup") {
    return <Badge variant="new">Payment due</Badge>;
  }
  return <Badge variant={STATUS_VARIANT[status]}>{SHOP_STATUS_LABELS[status]}</Badge>;
}

function hrefWith(params: { status?: string; city?: string; q?: string }) {
  const sp = new URLSearchParams();
  if (params.status && params.status !== "all") sp.set("status", params.status);
  if (params.city) sp.set("city", params.city);
  if (params.q) sp.set("q", params.q);
  const s = sp.toString();
  return s ? `/admin/shops?${s}` : "/admin/shops";
}

export default async function ShopsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; city?: string; q?: string }>;
}) {
  const { supabase } = await requireSuperAdmin();
  const sp = await searchParams;
  const filter: FilterKey = FILTERS.some((f) => f.key === sp.status) ? (sp.status as FilterKey) : "all";
  const city = (sp.city ?? "").trim();
  const q = (sp.q ?? "").trim().slice(0, 60);

  const since30 = startOfPkDay(30);
  const today = startOfPkDay(0);
  const todayDate = new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10); // PK date

  const [shopsRes, ordersTodayRes, ownersRes] = await Promise.all([
    supabase
      .from("shops")
      .select(
        "id, slug, name, city, area, logo_url, business_type, status, monthly_fee, paid_until, onboarding_step, created_at, products(count), orders(count)",
      )
      .gte("orders.created_at", since30)
      .order("created_at", { ascending: false })
      .limit(2000)
      .returns<Row[]>(),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", today),
    supabase.from("shop_members").select("shop_id, user_id").eq("role", "owner").limit(5000),
  ]);

  const shops = shopsRes.data ?? [];
  const members = (ownersRes.data ?? []) as { shop_id: string; user_id: string }[];
  const userIds = [...new Set(members.map((m) => m.user_id))];
  const profilesRes = userIds.length
    ? await supabase.from("profiles").select("id, full_name, phone").in("id", userIds)
    : { data: [] as { id: string; full_name: string | null; phone: string | null }[] };
  const profiles = new Map(
    ((profilesRes.data ?? []) as { id: string; full_name: string | null; phone: string | null }[]).map((p) => [p.id, p]),
  );
  const ownerOf = new Map<string, { name: string | null; phone: string | null }>();
  for (const m of members) {
    if (ownerOf.has(m.shop_id)) continue;
    const p = profiles.get(m.user_id);
    ownerOf.set(m.shop_id, { name: p?.full_name ?? null, phone: p?.phone ?? null });
  }

  const isOverdue = (s: Row) =>
    s.status === "payment_due" ||
    ((s.status === "active" || s.status === "trial") && !!s.paid_until && s.paid_until < todayDate);

  // --- stats ---
  const live = shops.filter((s) => s.status === "trial" || s.status === "active" || s.status === "payment_due");
  const inSetup = shops.filter((s) => s.status === "setup").length;
  const income = shops
    .filter((s) => s.status === "active" || s.status === "payment_due")
    .reduce((sum, s) => sum + (s.monthly_fee ?? 0), 0);
  const due = shops.filter(isOverdue).length;

  const matchesFilter = (s: Row, f: FilterKey) =>
    f === "all" ? true : f === "payment_due" ? isOverdue(s) : s.status === f;

  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.key, shops.filter((s) => matchesFilter(s, f.key) && (!city || s.city === city)).length]),
  ) as Record<FilterKey, number>;

  const cities = [...new Set(shops.map((s) => s.city).filter((c): c is string => !!c))].sort((a, b) =>
    a.localeCompare(b),
  );

  const needle = q.toLowerCase();
  const digits = q.replace(/\D/g, "");
  const phoneNeedle = digits.length >= 4 ? (toWhatsAppNumber(digits) ?? digits.replace(/^0+/, "")) : null;
  const list = shops.filter((s) => {
    if (!matchesFilter(s, filter)) return false;
    if (city && s.city !== city) return false;
    if (!q) return true;
    const owner = ownerOf.get(s.id);
    if (s.name.toLowerCase().includes(needle) || s.slug.includes(needle)) return true;
    if (owner?.name?.toLowerCase().includes(needle)) return true;
    if (phoneNeedle && owner?.phone && owner.phone.includes(phoneNeedle)) return true;
    return false;
  });

  return (
    <div className="mx-auto max-w-[1280px] p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight md:text-[28px]">Shops</h1>
          <p className="text-sm text-text-secondary">All shops on Dukaan</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button asChild variant="secondary" className="flex-1 sm:flex-none">
            <Link href="/admin/shops/import">
              <Upload /> Import shops (CSV)
            </Link>
          </Button>
          <Button asChild className="flex-1 sm:flex-none">
            <Link href="/admin/shops/new">
              <Plus /> Register new shop
            </Link>
          </Button>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label="Live shops" value={String(live.length)} sub={`${shops.length} total`} />
        <Stat label="Orders today" value={String(ordersTodayRes.count ?? 0)} sub="Across all shops" />
        <Stat label="Setup in progress" value={String(inSetup)} sub="Draft registrations" />
        <Stat
          label="Monthly income"
          value={formatRs(income)}
          sub={due ? `${due} payment${due === 1 ? "" : "s"} due` : "No payments due"}
          subClass={due ? "text-feedback-danger" : undefined}
        />
      </section>

      {shopsRes.error && (
        <p className="mt-4 rounded-xl bg-status-rejected-bg px-4 py-3 text-sm text-status-rejected-fg">
          Couldn&apos;t load shops: {shopsRes.error.message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={hrefWith({ status: f.key, city, q })}
              aria-current={f.key === filter ? "page" : undefined}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                f.key === filter
                  ? "border-brand-primary bg-brand-primary text-text-inverse"
                  : "border-border bg-surface-card text-text-primary hover:bg-brand-primary-soft",
              )}
            >
              {f.label} · {counts[f.key]}
            </Link>
          ))}
        </nav>
        <Form action="/admin/shops" className="flex flex-col gap-2 sm:flex-row" role="search">
          {filter !== "all" && <input type="hidden" name="status" value={filter} />}
          <select
            name="city"
            defaultValue={city}
            aria-label="City"
            className="h-11 rounded-full border border-border bg-surface-card px-4 text-sm outline-none focus:border-brand-primary"
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Shop, owner or phone"
              className="h-11 w-full rounded-full border border-border bg-surface-card pl-10 pr-4 text-sm outline-none placeholder:text-text-secondary focus:border-brand-primary"
            />
          </div>
          <Button type="submit" variant="secondary" className="h-11 rounded-full">
            Filter
          </Button>
        </Form>
      </div>

      {list.length === 0 ? (
        <div className="mt-4 rounded-card border border-dashed border-border px-4 py-12 text-center text-sm text-text-secondary">
          {shops.length === 0 ? (
            <>
              No shops yet.{" "}
              <Link href="/admin/shops/new" className="font-semibold text-brand-primary hover:underline">
                Register the first shop
              </Link>
            </>
          ) : (
            "No shops match these filters."
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-4 hidden overflow-x-auto rounded-card border border-border bg-surface-card md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Shop</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Area</th>
                  <th className="px-4 py-3 text-right font-medium">Products</th>
                  <th className="px-4 py-3 text-right font-medium">Orders (30d)</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((s) => {
                  const owner = ownerOf.get(s.id);
                  return (
                    <tr key={s.id} className="hover:bg-surface-bg/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ShopAvatar name={s.name} logoUrl={s.logo_url} className="h-10 w-10 text-sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{s.name}</p>
                            <p className="truncate text-xs text-text-secondary">/{s.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {owner ? (
                          <>
                            <p className="truncate">{owner.name ?? "—"}</p>
                            <p className="text-xs text-text-secondary">{owner.phone ? formatPhone(owner.phone) : ""}</p>
                          </>
                        ) : (
                          <span className="text-text-secondary">No owner yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{BUSINESS_TYPE_LABELS[s.business_type]}</td>
                      <td className="px-4 py-3">
                        <p className="truncate">{s.area ?? "—"}</p>
                        <p className="text-xs text-text-secondary">{s.city}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.products?.[0]?.count ?? 0}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{s.orders?.[0]?.count ?? 0}</td>
                      <td className="px-4 py-3">
                        <ShopStatusBadge status={s.status} overdue={isOverdue(s)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ShopAction shop={s} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="mt-4 space-y-3 md:hidden">
            {list.map((s) => {
              const owner = ownerOf.get(s.id);
              return (
                <li key={s.id} className="rounded-card border border-border bg-surface-card p-4">
                  <div className="flex items-start gap-3">
                    <ShopAvatar name={s.name} logoUrl={s.logo_url} className="h-11 w-11 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold">{s.name}</p>
                        <ShopStatusBadge status={s.status} overdue={isOverdue(s)} />
                      </div>
                      <p className="truncate text-xs text-text-secondary">
                        /{s.slug} · {BUSINESS_TYPE_LABELS[s.business_type]}
                      </p>
                      <p className="mt-1 truncate text-sm">
                        {owner ? `${owner.name ?? "Owner"}${owner.phone ? ` · ${formatPhone(owner.phone)}` : ""}` : "No owner yet"}
                      </p>
                      <p className="truncate text-xs text-text-secondary">
                        {[s.area, s.city].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                    <p className="text-xs text-text-secondary">
                      {s.products?.[0]?.count ?? 0} products · {s.orders?.[0]?.count ?? 0} orders (30d)
                    </p>
                    <ShopAction shop={s} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function ShopAction({ shop }: { shop: Row }) {
  if (shop.status === "setup") {
    return (
      <Button asChild size="sm">
        <Link href={`/admin/shops/${shop.id}/setup?step=${Math.min(5, Math.max(1, shop.onboarding_step))}`}>
          Continue setup
        </Link>
      </Button>
    );
  }
  return (
    <Button asChild size="sm" variant="secondary">
      <Link href={`/admin/shops/${shop.id}`}>Manage</Link>
    </Button>
  );
}

function Stat({
  label,
  value,
  sub,
  subClass,
}: {
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface-card p-4">
      <p className="text-xs font-medium text-text-secondary md:text-sm">{label}</p>
      <p className="mt-1 text-xl font-bold md:text-2xl">{value}</p>
      {sub && <p className={cn("mt-0.5 text-xs text-text-secondary", subClass)}>{sub}</p>}
    </div>
  );
}
