"use client";

import { useState, useTransition } from "react";
import { CheckCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toWhatsAppNumber } from "@/lib/format";
import { statusMessage, waLink } from "@/lib/whatsapp";
import type { Order, OrderStatus } from "@/lib/types";
import { markWhatsAppConfirmed, updateOrderStatus } from "@/app/dashboard/actions";

type NotifyKind = "preparing" | "out_for_delivery" | "delivered" | "rejected" | "ready";

const NOTIFY_LABEL: Record<NotifyKind, string> = {
  preparing: "Tell customer it's accepted",
  ready: "Tell customer it's ready",
  out_for_delivery: "Tell customer it's on the way",
  delivered: "Thank customer on WhatsApp",
  rejected: "Tell customer on WhatsApp",
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35ZM12.04 21.8h-.01a9.86 9.86 0 0 1-5.02-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.84 9.84 0 0 1-1.51-5.25c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 9.88 9.89c0 5.45-4.44 9.88-9.9 9.88Zm8.41-18.3A11.81 11.81 0 0 0 12.04 0C5.5 0 .16 5.33.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.33 11.89-11.89 0-3.18-1.24-6.16-3.49-8.41Z" />
    </svg>
  );
}

export { WhatsAppIcon };

/**
 * Status workflow buttons for one order. After each change we show a
 * "Tell customer on WhatsApp" button (a wa.me link to the CUSTOMER) instead of auto-opening it.
 */
export function OrderActions({
  order,
  shopName,
  layout,
}: {
  order: Pick<
    Order,
    "id" | "order_number" | "status" | "fulfillment" | "whatsapp_confirmed" | "customer_phone"
  >;
  shopName: string;
  layout: "panel" | "page";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notify, setNotify] = useState<NotifyKind | null>(null);

  const customerWa = toWhatsAppNumber(order.customer_phone);
  const isPickup = order.fulfillment === "pickup";

  const changeStatus = (status: OrderStatus, kind: NotifyKind) => {
    if (status === "rejected" && !window.confirm(`Reject order #${order.order_number}?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await updateOrderStatus(order.id, status);
      if (res.ok) setNotify(kind);
      else setError(res.error);
    });
  };

  const confirmWhatsApp = () => {
    setError(null);
    startTransition(async () => {
      const res = await markWhatsAppConfirmed(order.id);
      if (!res.ok) setError(res.error);
    });
  };

  // Buttons for the current status: [secondary, primary]
  const buttons: { label: string; onClick: () => void; variant: "primary" | "secondary" | "danger" }[] = [];
  switch (order.status) {
    case "new":
      buttons.push({ label: "Reject order", variant: "danger", onClick: () => changeStatus("rejected", "rejected") });
      buttons.push({
        label: "Accept & start preparing",
        variant: "primary",
        onClick: () => changeStatus("preparing", "preparing"),
      });
      break;
    case "preparing":
      if (isPickup) {
        buttons.push({ label: "Ready for pickup", variant: "secondary", onClick: () => setNotify("ready") });
        buttons.push({
          label: "Mark collected",
          variant: "primary",
          onClick: () => changeStatus("delivered", "delivered"),
        });
      } else {
        buttons.push({
          label: "Out for delivery",
          variant: "primary",
          onClick: () => changeStatus("out_for_delivery", "out_for_delivery"),
        });
      }
      break;
    case "out_for_delivery":
      buttons.push({
        label: "Mark delivered",
        variant: "primary",
        onClick: () => changeStatus("delivered", "delivered"),
      });
      break;
  }

  const showUnconfirmed = order.status === "new" && !order.whatsapp_confirmed;
  const notifyHref =
    notify && customerWa ? waLink(customerWa, statusMessage(notify, order.order_number, shopName)) : null;

  if (!buttons.length && !showUnconfirmed && !notifyHref && !error) return null;

  return (
    <div className="space-y-3 print:hidden">
      {showUnconfirmed && (
        <div className="flex flex-col gap-2 rounded-xl bg-status-unconfirmed-bg px-3.5 py-3 text-sm text-status-unconfirmed-fg sm:flex-row sm:items-center">
          <Info className="hidden h-4 w-4 shrink-0 sm:block" />
          <p className="flex-1">
            <span className="font-semibold">Unconfirmed</span> — the customer may not have sent the
            WhatsApp message.
          </p>
          <Button size="sm" variant="secondary" disabled={pending} onClick={confirmWhatsApp}>
            <CheckCheck /> Received on WhatsApp
          </Button>
        </div>
      )}

      {notifyHref && (
        <a
          href={notifyHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setNotify(null)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-brand-whatsapp px-5 text-sm font-semibold text-text-inverse hover:bg-brand-whatsapp/90"
        >
          <WhatsAppIcon className="h-5 w-5" />
          {NOTIFY_LABEL[notify!]}
        </a>
      )}

      {error && <p className="text-sm font-medium text-feedback-danger">{error}</p>}

      {buttons.length > 0 && (
        <div
          className={cn(
            "flex gap-3",
            layout === "page" ? "flex-col-reverse" : "flex-col-reverse sm:flex-row sm:justify-end",
          )}
        >
          {buttons.map((b) => (
            <Button
              key={b.label}
              variant={b.variant}
              size="lg"
              disabled={pending}
              onClick={b.onClick}
              className={cn(layout === "page" ? "w-full" : "sm:min-w-[128px]", b.variant === "danger" && "border-border")}
            >
              {b.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
