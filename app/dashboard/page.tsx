import Link from "next/link";
import Form from "next/form";
import { Search, X } from "lucide-react";
import { requireShopContext } from "@/lib/auth";
import { closesToday } from "@/lib/hours";
import { formatDate, formatRs, startOfPkDay, timeAgo, toWhatsAppNumber } from "@/lib/format";
import type { OrderWithItems } from "@/lib/types";
import { cn } from "@/lib/utils";
import { OrderCard } from "@/components/ui/order-card";
import { OrderDetail } from "@/components/dashboard/order-detail";
import { ShopOpenToggle } from "@/components/dashboard/shop-open-toggle";
import { SoundBell } from "@/components/dashboard/sound-bell";
import {
  TAB_LABELS,
  TAB_STATUSES,
  dashboardHref,
  parseTab,
  type OrdersTab,
} from "@/components/dashboard/utils";

export const metadata = { title: "Orders" };

const OPEN = "(new,preparing,out_for_delivery)";

function matchesSearch(o: OrderWithItems, raw: string) {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const num = q.replace(/^#/, "");
  if (/^\d+$/.test(num) && String(o.order_number) === num) return true;
  if (o.customer_name.toLowerCase().includes(q)) return true;
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 4) {
    const phone = toWhatsAppNumber(o.customer_phone) ?? o.customer_phone.replace(/\D/g, "");
    const needle = digits.replace(/^0+/, "").replace(/^92/, "");
    if (phone.includes(needle)) return true;
  }
  return false;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; tab?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tab = parseTab(sp.tab);
  const q = (sp.q ?? "").trim().slice(0, 60);
  const { supabase, shop, role } = await requireShopContext();

  const now = new Date();
  const today = startOfPkDay(0, now);
  const yesterday = startOfPkDay(1, now);
  const sameTimeYesterday = new Date(now.getTime() - 24 * 3600_000).toISOString();

  const [activeRes, doneRes, yesterdayRes] = await Promise.all([
    // Today's orders + every order still open (even from earlier days).
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("shop_id", shop.id)
      .or(`created_at.gte."${today}",status.in.${OPEN}`)
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<OrderWithItems[]>(),
    // Done tab: the last 50 finished orders.
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("shop_id", shop.id)
      .in("status", ["delivered", "rejected"])
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<OrderWithItems[]>(),
    // Orders yesterday up to this time of day, for "+4 vs yesterday".
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .gte("created_at", yesterday)
      .lt("created_at", sameTimeYesterday),
  ]);

  const active = activeRes.data ?? [];
  const doneList = doneRes.data ?? [];
  const loadError = activeRes.error || doneRes.error;

  // --- stats ---
  const todayMs = new Date(today).getTime();
  const todays = active.filter((o) => new Date(o.created_at).getTime() >= todayMs);
  const todaysSales = todays.filter((o) => o.status !== "rejected").reduce((s, o) => s + o.total, 0);
  const newOrders = active.filter((o) => o.status === "new");
  const oldestNew = newOrders[newOrders.length - 1];
  const unconfirmed = newOrders.filter((o) => !o.whatsapp_confirmed).length;
  const diff = todays.length - (yesterdayRes.count ?? 0);
  const diffLabel =
    yesterdayRes.count == null ? null : diff === 0 ? "Same as yesterday" : `${diff > 0 ? "+" : ""}${diff} vs yesterday`;

  const counts: Record<OrdersTab, number> = {
    new: newOrders.length,
    preparing: active.filter((o) => o.status === "preparing").length,
    out: active.filter((o) => o.status === "out_for_delivery").length,
    done: todays.filter((o) => o.status === "delivered" || o.status === "rejected").length,
  };

  // --- list ---
  let list: OrderWithItems[];
  if (q) {
    const seen = new Set<string>();
    list = [...active, ...doneList].filter((o) => {
      if (seen.has(o.id) || !matchesSearch(o, q)) return false;
      seen.add(o.id);
      return true;
    });
  } else if (tab === "done") {
    list = doneList;
  } else {
    list = active.filter((o) => TAB_STATUSES[tab].includes(o.status));
  }

  // --- selected order (desktop detail panel) ---
  const selectedId = sp.order ?? list[0]?.id;
  let selected: OrderWithItems | null =
    (selectedId && [...active, ...doneList].find((o) => o.id === selectedId)) || null;
  if (!selected && selectedId && /^[0-9a-f-]{36}$/i.test(selectedId)) {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("shop_id", shop.id)
      .eq("id", selectedId)
      .maybeSingle<OrderWithItems>();
    selected = data;
  }

  const closesAt = closesToday(shop.opening_hours);

  const searchForm = (
    <Form action="/dashboard" className="relative w-full md:w-72" role="search">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
      <input
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search by name, phone or #"
        className="h-11 w-full rounded-full border border-border bg-surface-card pl-10 pr-10 text-sm outline-none placeholder:text-text-secondary focus:border-brand-primary"
      />
      {q && (
        <Link
          href={dashboardHref({ tab })}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-text-secondary hover:bg-surface-bg"
        >
          <X className="h-4 w-4" />
        </Link>
      )}
    </Form>
  );

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-6 pt-5 md:px-8 md:pt-8">
      {/* Mobile header (Figma 5:111) */}
      <header className="flex items-start justify-between gap-3 md:hidden print:hidden">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary">Assalam-o-Alaikum</p>
          <p className="truncate text-xl font-bold">{shop.name}</p>
        </div>
        <SoundBell hasNew={newOrders.length > 0} />
      </header>
      {role !== "staff" && (
        <div className="mt-4 md:hidden print:hidden">
          <ShopOpenToggle isOpen={shop.is_open} closesAt={closesAt} variant="card" />
        </div>
      )}

      {/* Desktop header (Figma 8:181) */}
      <header className="hidden items-start justify-between gap-4 md:flex print:hidden">
        <div>
          <h1 className="text-[28px] font-bold leading-tight">Orders</h1>
          <p className="text-sm text-text-secondary">{formatDate(now)} · Today so far</p>
        </div>
        <div className="flex items-center gap-3">
          {searchForm}
          <SoundBell hasNew={newOrders.length > 0} />
        </div>
      </header>

      {/* Stats */}
      <section className="mt-3 grid grid-cols-2 gap-3 md:mt-6 md:grid-cols-4 md:gap-4 print:hidden">
        <Stat label="Today's orders" value={String(todays.length)} sub={diffLabel} subClass="text-brand-primary" />
        <Stat label="Today's sales" value={formatRs(todaysSales)} />
        <Stat
          className="hidden md:block"
          label="Waiting for you"
          value={`${newOrders.length} new`}
          sub={oldestNew ? `Oldest: ${timeAgo(oldestNew.created_at, now)}` : "All caught up"}
          subClass={oldestNew ? "text-status-new-fg" : undefined}
        />
        <Stat
          className="hidden md:block"
          label="Unconfirmed"
          value={String(unconfirmed)}
          sub="Customer didn't press send"
        />
      </section>

      {loadError && (
        <p className="mt-4 rounded-xl bg-status-rejected-bg px-4 py-3 text-sm text-status-rejected-fg">
          Couldn&apos;t load orders. Check your connection and refresh.
        </p>
      )}

      <div className="mt-4 md:mt-6 md:grid md:grid-cols-[minmax(300px,390px)_minmax(0,1fr)] md:items-start md:gap-6">
        {/* List column */}
        <section className="print:hidden">
          <div className="md:hidden">{searchForm}</div>
          {q ? (
            <p className="mt-3 text-sm text-text-secondary md:mt-0">
              {list.length} result{list.length === 1 ? "" : "s"} for “{q}”
            </p>
          ) : (
            <nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:mt-0 md:px-0 [&::-webkit-scrollbar]:hidden">
              {(Object.keys(TAB_LABELS) as OrdersTab[]).map((t) => (
                <Link
                  key={t}
                  href={dashboardHref({ tab: t })}
                  scroll={false}
                  aria-current={t === tab ? "page" : undefined}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    t === tab
                      ? "border-brand-primary bg-brand-primary text-text-inverse"
                      : "border-border bg-surface-card text-text-primary hover:bg-brand-primary-soft",
                  )}
                >
                  {TAB_LABELS[t]} · {counts[t]}
                </Link>
              ))}
            </nav>
          )}

          <ul className="mt-3 space-y-3">
            {list.map((o) => (
              <li key={o.id}>
                <Link href={`/dashboard/orders/${o.id}`} className="block md:hidden">
                  <OrderCard order={o} items={o.order_items} now={now} />
                </Link>
                <Link
                  href={dashboardHref({ tab, q, order: o.id })}
                  scroll={false}
                  className="hidden md:block"
                  aria-current={selected?.id === o.id ? "true" : undefined}
                >
                  <OrderCard
                    order={o}
                    items={o.order_items}
                    now={now}
                    selected={selected?.id === o.id}
                    className="hover:border-brand-primary/50"
                  />
                </Link>
              </li>
            ))}
          </ul>
          {list.length === 0 && (
            <div className="mt-3 rounded-card border border-dashed border-border px-4 py-10 text-center text-sm text-text-secondary">
              {q
                ? "No orders match your search."
                : tab === "new"
                  ? "No new orders right now. New orders will appear here with a sound alert."
                  : tab === "done"
                    ? "No finished orders yet."
                    : "Nothing here right now."}
            </div>
          )}
        </section>

        {/* Detail panel (desktop) */}
        <section className="sticky top-6 hidden md:block print:block">
          {selected ? (
            <OrderDetail order={selected} shopName={shop.name} variant="panel" now={now} />
          ) : (
            <div className="flex min-h-[320px] items-center justify-center rounded-card border border-dashed border-border text-sm text-text-secondary print:hidden">
              Select an order to see its details
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  subClass,
  className,
}: {
  label: string;
  value: string;
  sub?: string | null;
  subClass?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card border border-border bg-surface-card px-4 py-3.5 md:px-5 md:py-4", className)}>
      <p className="text-xs text-text-secondary md:text-sm">{label}</p>
      <p className="mt-1 text-xl font-bold md:text-2xl">{value}</p>
      {sub && <p className={cn("mt-0.5 hidden text-xs md:block", subClass ?? "text-text-secondary")}>{sub}</p>}
    </div>
  );
}
