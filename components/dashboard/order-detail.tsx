import Link from "next/link";
import { ChevronLeft, MapPin, Phone, Store } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDate, formatPhone, formatQty, formatRs, formatTime, startOfPkDay, timeAgo, toWhatsAppNumber } from "@/lib/format";
import type { OrderWithItems } from "@/lib/types";
import { OrderActions, WhatsAppIcon } from "./order-actions";
import { PrintButton } from "./print-button";
import { optionsLine, orderMapsUrl } from "./utils";

function whenLabel(iso: string, now: Date) {
  const isToday = new Date(iso).getTime() >= new Date(startOfPkDay(0, now)).getTime();
  const day = isToday ? "Today" : formatDate(iso).replace(/^\w+,?\s/, "");
  return `${day}, ${formatTime(iso)}`;
}

/**
 * Order details. `panel` = right-hand panel on desktop /dashboard (Figma 8:181);
 * `page` = full-screen mobile page /dashboard/orders/[id] (Figma 5:219).
 */
export function OrderDetail({
  order,
  shopName,
  variant,
  now,
}: {
  order: OrderWithItems;
  shopName: string;
  variant: "panel" | "page";
  now: Date;
}) {
  const customerWa = toWhatsAppNumber(order.customer_phone);
  const mapsUrl = order.fulfillment === "delivery" ? orderMapsUrl(order) : null;
  const isPage = variant === "page";

  const header = (
    <div className={cn("flex items-start gap-3", !isPage && "border-b border-border pb-5")}>
      {isPage && (
        <Link
          href="/dashboard"
          aria-label="Back to orders"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-card print:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className={cn("font-bold", isPage ? "text-xl" : "text-2xl")}>Order #{order.order_number}</h1>
          {!isPage && <StatusBadge status={order.status} whatsappConfirmed={order.whatsapp_confirmed} />}
        </div>
        <p className={cn("text-text-secondary", isPage ? "text-xs" : "text-sm")}>
          {whenLabel(order.created_at, now)}
          {!isPage && ` · ${timeAgo(order.created_at, now)}`}
        </p>
      </div>
      {isPage ? (
        <StatusBadge status={order.status} whatsappConfirmed={order.whatsapp_confirmed} className="mt-1" />
      ) : (
        <PrintButton />
      )}
    </div>
  );

  const cardCls = isPage
    ? "rounded-card border border-border bg-surface-card p-4"
    : "rounded-card bg-surface-bg p-4";

  const customer = (
    <section className={cardCls}>
      <p className="text-xs text-text-secondary">Customer</p>
      <p className="mt-0.5 text-lg font-bold">{order.customer_name}</p>
      <p className="text-sm text-text-secondary">{formatPhone(order.customer_phone)}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 print:hidden">
        <a
          href={`tel:${order.customer_phone.replace(/[^\d+]/g, "")}`}
          className="flex h-12 items-center justify-center gap-2 rounded-btn border border-border bg-surface-card text-sm font-semibold text-brand-primary hover:bg-brand-primary-soft"
        >
          <Phone className="h-4 w-4" /> Call
        </a>
        {customerWa ? (
          <a
            href={`https://wa.me/${customerWa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-2 rounded-btn bg-brand-whatsapp text-sm font-semibold text-text-inverse hover:bg-brand-whatsapp/90"
          >
            <WhatsAppIcon className="h-5 w-5" /> WhatsApp
          </a>
        ) : (
          <span className="flex h-12 items-center justify-center rounded-btn border border-dashed border-border text-xs text-text-secondary">
            No WhatsApp number
          </span>
        )}
      </div>
    </section>
  );

  const address = (
    <section className={cardCls}>
      {!isPage && (
        <p className="mb-1 text-xs text-text-secondary">
          {order.fulfillment === "delivery" ? "Delivery address" : "Pickup"}
        </p>
      )}
      {order.fulfillment === "delivery" ? (
        <div className="flex gap-2.5">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
          <div className="min-w-0">
            {order.delivery_area && (
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Area: {order.delivery_area}
              </p>
            )}
            <p className="text-[15px] font-medium">{order.address || "No address given"}</p>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-block text-sm font-semibold text-brand-primary hover:underline print:hidden"
              >
                Open in Google Maps
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="flex gap-2.5">
          <Store className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
          <p className="text-[15px] font-medium">Customer will pick up from the shop</p>
        </div>
      )}
      {order.note && <p className="mt-2 text-sm text-text-secondary">Note: {order.note}</p>}
    </section>
  );

  const items = (
    <section className={cardCls}>
      <p className="text-xs text-text-secondary">Items</p>
      <ul className="mt-2 space-y-3">
        {order.order_items.map((item) => {
          const opts = optionsLine(item.options);
          return (
            <li key={item.id} className="flex justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[15px] font-medium">
                  {formatQty(item.quantity, item.unit)} {item.product_name}
                </p>
                {opts && <p className="text-xs text-text-secondary">{opts}</p>}
                {item.note && <p className="text-xs italic text-text-secondary">Note: {item.note}</p>}
              </div>
              <p className="shrink-0 text-[15px] font-medium">{formatRs(item.line_total)}</p>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-secondary">Subtotal</span>
          <span>{formatRs(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">
            {order.fulfillment === "delivery"
              ? `Delivery fee${order.delivery_area ? ` (${order.delivery_area})` : ""}`
              : "Pickup"}
          </span>
          <span>{order.fulfillment === "delivery" ? formatRs(order.delivery_fee) : "Free"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Payment</span>
          <span>Cash on delivery</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-bold">Total</span>
          <span className="text-lg font-bold text-brand-primary">{formatRs(order.total)}</span>
        </div>
      </div>
    </section>
  );

  const actions = <OrderActions key={order.id} order={order} shopName={shopName} layout={variant} />;

  if (isPage) {
    return (
      <div className="flex min-h-svh flex-col">
        <div className="flex-1 space-y-3 px-4 pb-6 pt-4">
          {header}
          {customer}
          {address}
          {items}
          <div className="flex justify-center pt-1">
            <PrintButton className="h-9 text-xs" />
          </div>
        </div>
        <div className="sticky bottom-0 border-t border-border bg-surface-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 empty:hidden print:hidden">
          {actions}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface-card p-6 print:border-0 print:p-0">
      {header}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {customer}
        {address}
      </div>
      <div className="mt-4">{items}</div>
      <div className="mt-5">{actions}</div>
    </div>
  );
}
