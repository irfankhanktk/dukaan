import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatQty, formatRs, timeAgo } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/types";
import { StatusBadge } from "./badge";

export function itemsSummary(
  items: Pick<OrderItem, "product_name" | "quantity" | "options" | "unit">[],
) {
  return items
    .map((i) => {
      const size = i.options.find((o) => /size|weight/i.test(o.group))?.choice;
      const qty = formatQty(i.quantity, i.unit).replace(/x$/, "×");
      return i.unit === "kg"
        ? `${i.product_name} (${qty})`
        : `${qty} ${i.product_name}${size ? ` (${size})` : ""}`;
    })
    .join(", ");
}

/** Figma "Order card": #1042, badge, customer · area, items summary, time ago, total. */
export function OrderCard({
  order,
  items,
  selected,
  now,
  className,
}: {
  order: Pick<
    Order,
    "order_number" | "customer_name" | "address" | "status" | "whatsapp_confirmed" | "created_at" | "total" | "fulfillment"
  >;
  items: Pick<OrderItem, "product_name" | "quantity" | "options" | "unit">[];
  selected?: boolean;
  now?: Date;
  className?: string;
}) {
  const area =
    order.fulfillment === "pickup"
      ? "Pickup"
      : (order.address ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(-1)[0];
  return (
    <div
      className={cn(
        "rounded-card border bg-surface-card p-4 transition-colors",
        selected ? "border-brand-primary ring-1 ring-brand-primary" : "border-border",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-lg font-bold">#{order.order_number}</p>
        <StatusBadge status={order.status} whatsappConfirmed={order.whatsapp_confirmed} />
      </div>
      <p className="mt-0.5 truncate text-[13px] text-text-secondary">
        {order.customer_name}
        {area ? ` · ${area}` : ""}
      </p>
      <p className="mt-2 line-clamp-2 text-sm font-medium">{itemsSummary(items)}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-text-secondary">
          <Clock className="h-3.5 w-3.5" />
          {timeAgo(order.created_at, now)}
        </span>
        <span className="text-base font-bold text-brand-primary">{formatRs(order.total)}</span>
      </div>
    </div>
  );
}
