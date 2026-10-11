import { mapsLink } from "@/lib/whatsapp";
import type { Order, OrderItemOption, OrderStatus } from "@/lib/types";

/** Google Maps link: exact pin if we have lat/lng, otherwise a search for the address. */
export function orderMapsUrl(order: Pick<Order, "lat" | "lng" | "address">): string | null {
  if (order.lat != null && order.lng != null) return mapsLink(order.lat, order.lng);
  if (order.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;
  }
  return null;
}

/** "2 lb · Birthday candles · Message: "Happy Birthday Sara!"" */
export function optionsLine(options: OrderItemOption[] | null | undefined): string {
  return (options ?? [])
    .map((o) => (/message|text|name on/i.test(o.group) ? `${o.group}: “${o.choice}”` : o.choice))
    .join(" · ");
}

export type OrdersTab = "new" | "preparing" | "out" | "done";

export const TAB_STATUSES: Record<OrdersTab, OrderStatus[]> = {
  new: ["new"],
  preparing: ["preparing"],
  out: ["out_for_delivery"],
  done: ["delivered", "rejected"],
};

export const TAB_LABELS: Record<OrdersTab, string> = {
  new: "New",
  preparing: "Preparing",
  out: "On the way",
  done: "Done",
};

export function parseTab(v: string | undefined): OrdersTab {
  return v === "preparing" || v === "out" || v === "done" ? v : "new";
}

/** Build a /dashboard URL keeping the relevant search params. */
export function dashboardHref(params: { tab?: OrdersTab; order?: string; q?: string }): string {
  const sp = new URLSearchParams();
  if (params.tab && params.tab !== "new") sp.set("tab", params.tab);
  if (params.q) sp.set("q", params.q);
  if (params.order) sp.set("order", params.order);
  const s = sp.toString();
  return s ? `/dashboard?${s}` : "/dashboard";
}
