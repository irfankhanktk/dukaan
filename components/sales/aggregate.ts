import { startOfPkDay } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export type SalesRange = "today" | "7d" | "30d";

export const RANGES: { value: SalesRange; label: string; days: number; previousLabel: string }[] = [
  { value: "today", label: "Today", days: 1, previousLabel: "yesterday" },
  { value: "7d", label: "7 days", days: 7, previousLabel: "previous 7 days" },
  { value: "30d", label: "30 days", days: 30, previousLabel: "previous 30 days" },
];

export function parseRange(value: string | string[] | undefined): SalesRange {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "today" || v === "30d" ? v : "7d";
}

export type SalesOrderRow = {
  id: string;
  total: number;
  status: OrderStatus;
  whatsapp_confirmed: boolean;
  created_at: string;
};

export type SalesItemRow = {
  product_name: string;
  quantity: number | string;
  line_total: number;
};

const PK_OFFSET_MS = 5 * 3600_000;

/** "2026-10-11" — the Pakistan calendar day an instant falls on. */
export function pkDateKey(iso: string | Date): string {
  return new Date(new Date(iso).getTime() + PK_OFFSET_MS).toISOString().slice(0, 10);
}

function pkHour(iso: string): number {
  return new Date(new Date(iso).getTime() + PK_OFFSET_MS).getUTCHours();
}

/** Period boundaries (UTC ISO strings) for the current and the previous equal-length period. */
export function rangeBounds(range: SalesRange, now: Date = new Date()) {
  const days = RANGES.find((r) => r.value === range)!.days;
  return {
    days,
    start: startOfPkDay(days - 1, now),
    previousStart: startOfPkDay(days * 2 - 1, now),
  };
}

export type Bucket = { key: string; label: string; longLabel: string; total: number; orders: number };

/** Hourly buckets for "today", daily buckets otherwise. Rejected orders are excluded. */
export function buildBuckets(
  range: SalesRange,
  orders: SalesOrderRow[],
  now: Date = new Date(),
): Bucket[] {
  const counted = orders.filter((o) => o.status !== "rejected");

  if (range === "today") {
    const currentHour = pkHour(now.toISOString());
    const byHour = new Map<number, { total: number; orders: number }>();
    for (const o of counted) {
      const h = pkHour(o.created_at);
      const b = byHour.get(h) ?? { total: 0, orders: 0 };
      b.total += o.total;
      b.orders += 1;
      byHour.set(h, b);
    }
    // Show from the first hour with an order (or 8 AM) up to now, so the chart isn't mostly empty night.
    const hours = [...byHour.keys()];
    const first = Math.min(8, currentHour, ...hours);
    const last = Math.max(currentHour, ...hours);
    const buckets: Bucket[] = [];
    for (let h = first; h <= last; h++) {
      const b = byHour.get(h) ?? { total: 0, orders: 0 };
      buckets.push({
        key: String(h),
        label: hourLabel(h),
        longLabel: `${hourLabel(h)}–${hourLabel((h + 1) % 24)}`,
        ...b,
      });
    }
    return buckets;
  }

  const { days } = rangeBounds(range, now);
  const byDay = new Map<string, { total: number; orders: number }>();
  for (const o of counted) {
    const k = pkDateKey(o.created_at);
    const b = byDay.get(k) ?? { total: 0, orders: 0 };
    b.total += o.total;
    b.orders += 1;
    byDay.set(k, b);
  }
  const buckets: Bucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    // Noon PKT of each day keeps the formatter on the right calendar day.
    const dayStart = new Date(startOfPkDay(i, now));
    const key = pkDateKey(dayStart);
    const mid = new Date(dayStart.getTime() + 12 * 3600_000);
    const b = byDay.get(key) ?? { total: 0, orders: 0 };
    buckets.push({
      key,
      label:
        range === "7d"
          ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", weekday: "short" }).format(mid)
          : new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric" }).format(mid),
      longLabel: new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Karachi",
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(mid),
      ...b,
    });
  }
  return buckets;
}

function hourLabel(h: number): string {
  const suffix = h < 12 ? "am" : "pm";
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n}${suffix}`;
}

export type Kpis = {
  sales: number;
  orders: number;
  average: number;
  deliveredPct: number | null;
  rejected: number;
};

export function computeKpis(orders: SalesOrderRow[]): Kpis {
  const counted = orders.filter((o) => o.status !== "rejected");
  const sales = counted.reduce((s, o) => s + o.total, 0);
  const delivered = orders.filter((o) => o.status === "delivered").length;
  return {
    sales,
    orders: counted.length,
    average: counted.length ? Math.round(sales / counted.length) : 0,
    deliveredPct: orders.length ? Math.round((delivered / orders.length) * 100) : null,
    rejected: orders.length - counted.length,
  };
}

export type StatusKey = OrderStatus | "unconfirmed";

export const STATUS_ORDER: StatusKey[] = [
  "unconfirmed",
  "new",
  "preparing",
  "out_for_delivery",
  "delivered",
  "rejected",
];

/** Counts per status; a "new" order not yet confirmed on WhatsApp counts as "unconfirmed". */
export function statusBreakdown(orders: SalesOrderRow[]): Record<StatusKey, number> {
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<StatusKey, number>;
  for (const o of orders) {
    const key: StatusKey = o.status === "new" && !o.whatsapp_confirmed ? "unconfirmed" : o.status;
    counts[key] += 1;
  }
  return counts;
}

export type TopProduct = { name: string; quantity: number; revenue: number };

export function topProducts(items: SalesItemRow[], limit = 8): TopProduct[] {
  const map = new Map<string, TopProduct>();
  for (const it of items) {
    const p = map.get(it.product_name) ?? { name: it.product_name, quantity: 0, revenue: 0 };
    p.quantity += Number(it.quantity);
    p.revenue += it.line_total;
    map.set(it.product_name, p);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

/** 31200 → "31.2k", 148600 → "1.5L" (lakh), 850 → "850" */
export function compactRs(n: number): string {
  if (n >= 100_000) return `${trim(n / 100_000)}L`;
  if (n >= 1000) return `${trim(n / 1000)}k`;
  return String(Math.round(n));
}

function trim(x: number): string {
  return x.toFixed(1).replace(/\.0$/, "");
}

/** Percent change vs the previous period, or null when there is nothing to compare. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
