import { formatPhone, formatQty, formatRs } from "./format";
import type { OrderItemOption, Unit } from "./types";

export function waLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function mapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

type MessageItem = {
  product_name: string;
  quantity: number;
  unit?: Unit;
  options: OrderItemOption[];
  note?: string | null;
  line_total: number;
};

type MessageOrder = {
  order_number: number;
  shop_name: string;
  items: MessageItem[];
  fulfillment: "delivery" | "pickup";
  delivery_fee: number;
  total: number;
  customer_name: string;
  customer_phone: string;
  delivery_area?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  note?: string | null;
};

function itemLine(item: MessageItem): string {
  const qty = formatQty(item.quantity, item.unit ?? "piece");
  const opts = item.options.map((o) =>
    o.group.toLowerCase().includes("message") ? `"${o.choice}"` : o.choice,
  );
  const optText = opts.length ? ` (${opts.join(", ")})` : "";
  const noteText = item.note ? ` – Note: ${item.note}` : "";
  return `${qty} ${item.product_name}${optText} – ${formatRs(item.line_total)}${noteText}`;
}

/** The order message the customer sends to the shop (format from CLAUDE.md). */
export function buildOrderMessage(o: MessageOrder): string {
  const lines: string[] = [];
  lines.push(`New Order #${o.order_number} – ${o.shop_name}`);
  lines.push("");
  for (const item of o.items) lines.push(itemLine(item));
  lines.push("");
  if (o.fulfillment === "delivery") {
    lines.push(`Delivery: ${formatRs(o.delivery_fee)}`);
  } else {
    lines.push("Pickup from shop");
  }
  lines.push(`Total: ${formatRs(o.total)}`);
  lines.push("");
  lines.push(`Name: ${o.customer_name}`);
  lines.push(`Phone: ${formatPhone(o.customer_phone)}`);
  if (o.fulfillment === "delivery" && o.delivery_area) lines.push(`Area: ${o.delivery_area}`);
  if (o.fulfillment === "delivery" && o.address) lines.push(`Address: ${o.address}`);
  if (o.fulfillment === "delivery" && o.lat != null && o.lng != null) {
    lines.push(`Location: ${mapsLink(o.lat, o.lng)}`);
  }
  if (o.note) lines.push(`Note: ${o.note}`);
  lines.push("Payment: Cash on delivery");
  return lines.join("\n");
}

/** Prefilled status-update messages the shopkeeper sends to the customer. */
export function statusMessage(
  status: "preparing" | "out_for_delivery" | "delivered" | "rejected" | "ready",
  orderNumber: number,
  shopName: string,
): string {
  switch (status) {
    case "preparing":
      return `Assalam o Alaikum! Your order #${orderNumber} from ${shopName} has been accepted and is being prepared.`;
    case "ready":
      return `Your order #${orderNumber} from ${shopName} is ready for pickup.`;
    case "out_for_delivery":
      return `Your order #${orderNumber} from ${shopName} is on the way!`;
    case "delivered":
      return `Your order #${orderNumber} has been delivered. Thank you for ordering from ${shopName}!`;
    case "rejected":
      return `Sorry, ${shopName} could not accept your order #${orderNumber}. Please contact us for details.`;
  }
}
