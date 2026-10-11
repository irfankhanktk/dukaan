import Link from "next/link";
import type { Metadata } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireShopOwnerContext } from "@/lib/auth";
import { formatRs, STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { SalesChart } from "@/components/sales/sales-chart";
import {
  RANGES,
  STATUS_ORDER,
  buildBuckets,
  computeKpis,
  parseRange,
  percentChange,
  rangeBounds,
  statusBreakdown,
  topProducts,
  type SalesItemRow,
  type SalesOrderRow,
  type StatusKey,
} from "@/components/sales/aggregate";

export const metadata: Metadata = { title: "Sales · Dukaan" };

const PAGE = 1000;
const MAX_ROWS = 20_000;

/** PostgREST caps responses (default 1000 rows), so page through. */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error || !data) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

async function loadSales(supabase: SupabaseClient, shopId: string, start: string, previousStart: string) {
  const [orders, items] = await Promise.all([
    fetchAll<SalesOrderRow>((from, to) =>
      supabase
        .from("orders")
        .select("id, total, status, whatsapp_confirmed, created_at")
        .eq("shop_id", shopId)
        .gte("created_at", previousStart)
        .order("created_at")
        .range(from, to),
    ),
    fetchAll<SalesItemRow>((from, to) =>
      supabase
        .from("order_items")
        .select("product_name, quantity, line_total, orders!inner(shop_id, status, created_at)")
        .eq("orders.shop_id", shopId)
        .gte("orders.created_at", start)
        .neq("orders.status", "rejected")
        .order("id")
        .range(from, to),
    ),
  ]);
  const startMs = new Date(start).getTime();
  const current = orders.filter((o) => new Date(o.created_at).getTime() >= startMs);
  const previous = orders.filter((o) => new Date(o.created_at).getTime() < startMs);
  return { current, previous, items };
}

const STATUS_STYLES: Record<StatusKey, { label: string; bar: string; dot: string }> = {
  unconfirmed: { label: "Unconfirmed", bar: "bg-status-unconfirmed-fg", dot: "bg-status-unconfirmed-fg" },
  new: { label: STATUS_LABELS.new, bar: "bg-status-new-fg", dot: "bg-status-new-fg" },
  preparing: { label: STATUS_LABELS.preparing, bar: "bg-status-preparing-fg", dot: "bg-status-preparing-fg" },
  out_for_delivery: {
    label: STATUS_LABELS.out_for_delivery,
    bar: "bg-status-out-fg",
    dot: "bg-status-out-fg",
  },
  delivered: { label: STATUS_LABELS.delivered, bar: "bg-status-delivered-fg", dot: "bg-status-delivered-fg" },
  rejected: { label: STATUS_LABELS.rejected, bar: "bg-status-rejected-fg", dot: "bg-status-rejected-fg" },
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);
  const rangeMeta = RANGES.find((r) => r.value === range)!;
  const { supabase, shop } = await requireShopOwnerContext();

  const now = new Date();
  const { start, previousStart } = rangeBounds(range, now);
  const { current, previous, items } = await loadSales(supabase, shop.id, start, previousStart);

  const kpis = computeKpis(current);
  const prevKpis = computeKpis(previous);
  const salesChange = percentChange(kpis.sales, prevKpis.sales);
  const ordersDiff = kpis.orders - prevKpis.orders;
  const buckets = buildBuckets(range, current, now);
  const top = topProducts(items);
  const statuses = statusBreakdown(current);
  const totalOrders = current.length;

  const periodText =
    range === "today"
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Karachi",
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(now)
      : `${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short" }).format(
          new Date(new Date(start).getTime() + 12 * 3600_000),
        )} – ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short" }).format(now)}`;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary md:text-[28px]">Sales</h1>
          <p className="mt-0.5 text-sm text-text-secondary">{periodText}</p>
        </div>
        <nav
          aria-label="Date range"
          className="grid grid-cols-3 gap-1 rounded-btn border border-border bg-surface-card p-1 md:w-auto"
        >
          {RANGES.map((r) => {
            const active = r.value === range;
            return (
              <Link
                key={r.value}
                href={r.value === "7d" ? "/dashboard/sales" : `/dashboard/sales?range=${r.value}`}
                aria-current={active ? "page" : undefined}
                scroll={false}
                className={cn(
                  "rounded-[10px] px-4 py-2 text-center text-sm font-semibold transition-colors",
                  active
                    ? "bg-brand-primary text-text-inverse"
                    : "text-text-secondary hover:bg-brand-primary-soft hover:text-brand-primary",
                )}
              >
                {r.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* KPI cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:mt-6 md:grid-cols-4 md:gap-4">
        <Kpi
          className="col-span-2 md:col-span-1"
          label="Total sales"
          value={formatRs(kpis.sales)}
          note={
            salesChange === null
              ? undefined
              : `${salesChange >= 0 ? "+" : ""}${salesChange}% vs ${rangeMeta.previousLabel}`
          }
          noteTone={salesChange === null ? "muted" : salesChange >= 0 ? "good" : "bad"}
        />
        <Kpi
          label="Orders"
          value={String(kpis.orders)}
          note={
            prevKpis.orders || kpis.orders
              ? `${ordersDiff >= 0 ? "+" : ""}${ordersDiff} vs ${rangeMeta.previousLabel}`
              : undefined
          }
          noteTone={ordersDiff >= 0 ? "good" : "bad"}
        />
        <Kpi label="Average order" value={formatRs(kpis.average)} />
        <Kpi
          label="Delivered"
          value={kpis.deliveredPct === null ? "–" : `${kpis.deliveredPct}%`}
          note={kpis.rejected ? `${kpis.rejected} rejected` : undefined}
          noteTone="muted"
        />
      </div>

      <div className="mt-4 grid gap-4 md:mt-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:gap-6">
        <Card className="p-4 md:p-6">
          <SalesChart
            title={range === "today" ? "Sales by hour" : "Daily sales"}
            buckets={buckets}
          />
        </Card>

        <Card className="p-4 md:p-6">
          <h2 className="text-[15px] font-bold text-text-primary">Top items</h2>
          {top.length === 0 ? (
            <p className="mt-4 text-sm text-text-secondary">No items sold in this period yet.</p>
          ) : (
            <ol className="mt-3 divide-y divide-border">
              {top.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-text-primary">{p.name}</p>
                    <p className="text-xs text-text-secondary">{formatQtyTotal(p.quantity)} sold</p>
                  </div>
                  <p className="shrink-0 text-[15px] font-bold text-text-primary">{formatRs(p.revenue)}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Status breakdown */}
      <Card className="mt-4 p-4 md:mt-6 md:p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-bold text-text-primary">Orders by status</h2>
          <span className="text-xs text-text-secondary">{totalOrders} total</span>
        </div>
        {totalOrders === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">No orders in this period yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2 md:gap-x-10">
            {STATUS_ORDER.map((s) => {
              const count = statuses[s];
              const pct = Math.round((count / totalOrders) * 100);
              const style = STATUS_STYLES[s];
              return (
                <li key={s} className="flex items-center gap-3">
                  <span className="flex w-36 shrink-0 items-center gap-2 text-sm text-text-primary">
                    <span className={cn("h-2 w-2 rounded-full", style.dot)} aria-hidden />
                    {style.label}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-bg" aria-hidden>
                    <span
                      className={cn("block h-full rounded-full", style.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-16 shrink-0 text-right text-sm font-semibold text-text-primary">
                    {count} <span className="text-xs font-normal text-text-secondary">({pct}%)</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function formatQtyTotal(q: number): string {
  return Number.isInteger(q) ? String(q) : q.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function Kpi({
  label,
  value,
  note,
  noteTone = "muted",
  className,
}: {
  label: string;
  value: string;
  note?: string;
  noteTone?: "good" | "bad" | "muted";
  className?: string;
}) {
  return (
    <Card className={cn("p-4 md:p-5", className)}>
      <p className="text-[13px] text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-text-primary md:text-[26px]">{value}</p>
      {note && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            noteTone === "good" && "text-status-delivered-fg",
            noteTone === "bad" && "text-feedback-danger",
            noteTone === "muted" && "text-text-secondary",
          )}
        >
          {note}
        </p>
      )}
    </Card>
  );
}
