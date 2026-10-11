import type { ShopStatus } from "@/lib/types";

export const SHOP_STATUS_LABELS: Record<ShopStatus, string> = {
  setup: "Setup",
  trial: "Trial",
  active: "Active",
  payment_due: "Payment due",
  suspended: "Suspended",
};

/** Shop status → Badge variant (reuses the order status colours). */
export const SHOP_STATUS_VARIANT = {
  active: "delivered",
  trial: "preparing",
  setup: "unconfirmed",
  payment_due: "new",
  suspended: "rejected",
} as const satisfies Record<ShopStatus, string>;

export const SHOP_TABS = ["overview", "menu", "orders", "owner", "billing", "activity"] as const;
export type ShopTab = (typeof SHOP_TABS)[number];

export const SHOP_TAB_LABELS: Record<ShopTab, string> = {
  overview: "Overview",
  menu: "Menu",
  orders: "Orders",
  owner: "Owner & access",
  billing: "Billing",
  activity: "Activity log",
};

export function parseShopTab(v: string | undefined): ShopTab {
  return (SHOP_TABS as readonly string[]).includes(v ?? "") ? (v as ShopTab) : "overview";
}

export function shopTabHref(shopId: string, tab: ShopTab, extra?: Record<string, string>) {
  const params = new URLSearchParams(tab === "overview" ? {} : { tab });
  for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
  const qs = params.toString();
  return `/admin/shops/${shopId}${qs ? `?${qs}` : ""}`;
}

export const PAYMENT_METHODS = ["cash", "jazzcash", "easypaisa", "bank"] as const;
export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Cash",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bank: "Bank transfer",
};

/** "2026-10-11" → "11 Oct 2026" (date-only values, no timezone shift). */
export function formatDay(date: string | null | undefined): string {
  if (!date) return "—";
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Date + time in Pakistan time, e.g. "11 Oct 2026, 3:05 pm". */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** Today's date in Pakistan as YYYY-MM-DD. */
export function pkToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 5 * 3600_000).toISOString().slice(0, 10);
}

/** Add days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** One billing month: start + 1 month − 1 day (31 Jan → clamps to end of Feb). */
export function periodEndFor(start: string): string {
  const d = new Date(`${start}T00:00:00Z`);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  target.setUTCDate(target.getUTCDate() - 1);
  return target.toISOString().slice(0, 10);
}
