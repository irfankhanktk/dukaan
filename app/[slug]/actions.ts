"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toWhatsAppNumber } from "@/lib/format";
import { orderErrorMessage, translate, type Lang } from "@/lib/i18n";
import { getPublicOrder, orderWhatsAppUrl } from "./data";

const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const itemSchema = z.object({
  product_id: uuid,
  quantity: z.number().positive().max(1000),
  option_value_ids: z.array(uuid).max(50).default([]),
  texts: z
    .array(z.object({ group_id: uuid, text: z.string().trim().max(200) }))
    .max(20)
    .default([]),
  note: optionalText(300),
});

const orderSchema = z.object({
  slug: z.string().min(1).max(100),
  lang: z.enum(["en", "ur"]).default("en"),
  customer_name: z.string().trim().min(1).max(100),
  customer_phone: z.string().trim().min(1).max(30),
  fulfillment: z.enum(["delivery", "pickup"]),
  delivery_area: optionalText(60),
  address: optionalText(500),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  note: optionalText(500),
  // Prices are deliberately NOT accepted from the browser.
  items: z.array(itemSchema).min(1).max(100),
});

export type PlaceOrderInput = z.input<typeof orderSchema>;

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: number; waUrl: string }
  | { ok: false; error: string; field?: "customer_name" | "customer_phone" | "address" | "delivery_area" };

/**
 * Validates the cart, places the order through the place_order RPC (which recalculates
 * every price from the database), then builds the WhatsApp message from the saved order.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const lang: Lang = input?.lang === "ur" ? "ur" : "en";
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    if (path === "customer_name")
      return { ok: false, field: "customer_name", error: translate(lang, "errName") };
    if (path === "customer_phone")
      return { ok: false, field: "customer_phone", error: translate(lang, "errPhone") };
    if (path === "items") return { ok: false, error: translate(lang, "errEmptyCart") };
    return { ok: false, error: translate(lang, "errGeneric") };
  }
  const data = parsed.data;

  const phone = toWhatsAppNumber(data.customer_phone);
  if (!phone) return { ok: false, field: "customer_phone", error: translate(lang, "errPhone") };

  if (data.fulfillment === "delivery" && !data.address) {
    return { ok: false, field: "address", error: translate(lang, "errAddress") };
  }

  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("id, is_open, pickup_enabled, delivery_areas")
    .eq("slug", data.slug)
    .in("status", ["trial", "active", "payment_due"])
    .maybeSingle<{ id: string; is_open: boolean; pickup_enabled: boolean; delivery_areas: { name: string }[] | null }>();
  if (!shop) return { ok: false, error: translate(lang, "errShopNotFound") };
  if (!shop.is_open) return { ok: false, error: translate(lang, "errShopClosed") };

  const isDelivery = data.fulfillment === "delivery";
  if (!isDelivery && !shop.pickup_enabled) {
    return { ok: false, error: translate(lang, "errPickupDisabled") };
  }
  // Per-area delivery: the area must be one of the shop's (the RPC checks again and sets the fee).
  const hasAreas = Array.isArray(shop.delivery_areas) && shop.delivery_areas.length > 0;
  if (isDelivery && hasAreas && !data.delivery_area) {
    return { ok: false, field: "delivery_area", error: translate(lang, "errArea") };
  }
  const hasLocation = isDelivery && data.lat != null && data.lng != null;

  const { data: placed, error } = await supabase.rpc("place_order", {
    p_shop_id: shop.id,
    p_customer_name: data.customer_name,
    p_customer_phone: phone,
    p_fulfillment: data.fulfillment,
    p_delivery_area: isDelivery && hasAreas ? data.delivery_area : null,
    p_address: isDelivery ? data.address : null,
    p_lat: hasLocation ? data.lat : null,
    p_lng: hasLocation ? data.lng : null,
    p_note: data.note,
    p_items: data.items.map((i) => ({
      product_id: i.product_id,
      quantity: Math.round(i.quantity * 100) / 100,
      option_value_ids: i.option_value_ids,
      texts: i.texts.filter((t) => t.text.length > 0),
      note: i.note,
    })),
  });

  if (error || !placed) {
    if (error) console.error("place_order failed:", error.message);
    const message = orderErrorMessage(lang, error?.message);
    if (error?.message?.startsWith("INVALID_DELIVERY_AREA")) {
      return { ok: false, field: "delivery_area", error: message };
    }
    return { ok: false, error: message };
  }

  const orderId = (placed as { id: string }).id;
  const order = await getPublicOrder(orderId);
  if (!order) {
    // Saved, but we couldn't read it back — still send the customer to the order page.
    return {
      ok: true,
      orderId,
      orderNumber: (placed as { order_number: number }).order_number,
      waUrl: "",
    };
  }

  return {
    ok: true,
    orderId,
    orderNumber: order.order_number,
    waUrl: orderWhatsAppUrl(order),
  };
}
