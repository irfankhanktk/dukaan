import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isLang, LANG_COOKIE, type Lang } from "@/lib/i18n";
import { buildOrderMessage, waLink } from "@/lib/whatsapp";
import type {
  Category,
  Fulfillment,
  OrderItemOption,
  OrderStatus,
  ProductWithOptions,
  PublicShop,
  ShopStatus,
  Unit,
} from "@/lib/types";
import { PUBLIC_SHOP_COLUMNS } from "@/lib/types";

/** Statuses in which a shop's page is public (matches the anon RLS policy). */
const PUBLIC_STATUSES: ShopStatus[] = ["trial", "active", "payment_due"];

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const v = store.get(LANG_COOKIE)?.value;
  return isLang(v) ? v : "en";
}

/**
 * Publicly visible shop by slug (deduplicated per request between generateMetadata and the page).
 * Only the anon-readable columns are selected; shops in setup/suspended are not returned
 * (also for signed-in members/admins, whose RLS would otherwise let them read it).
 */
export const getShopBySlug = cache(async (slug: string): Promise<PublicShop | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .select(PUBLIC_SHOP_COLUMNS)
    .eq("slug", slug)
    .in("status", PUBLIC_STATUSES)
    .maybeSingle();
  if (error || !data) return null;
  const shop = data as unknown as PublicShop;
  return {
    ...shop,
    opening_hours: shop.opening_hours ?? {},
    delivery_areas: Array.isArray(shop.delivery_areas) ? shop.delivery_areas : [],
    pickup_enabled: shop.pickup_enabled ?? true,
  };
});

/** Status of any shop by slug (null if none) — to tell "suspended" apart from "not found". */
export const getShopPublicStatus = cache(async (slug: string): Promise<ShopStatus | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("shop_public_status", { p_slug: slug });
  if (error || !data) return null;
  return data as ShopStatus;
});

const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

/** Menu for a shop (deduplicated per request between generateMetadata and the page). */
export const getMenu = cache(async (
  shopId: string,
): Promise<{ categories: Category[]; products: ProductWithOptions[] }> => {
  const supabase = await createClient();
  const [cats, prods] = await Promise.all([
    supabase
      .from("categories")
      .select("id, shop_id, name, sort_order")
      .eq("shop_id", shopId)
      .order("sort_order"),
    supabase
      .from("products")
      .select(
        "id, shop_id, category_id, name, description, base_price, unit, qty_step, photo_url, is_available, details, sort_order, option_groups(id, product_id, name, type, is_required, min_select, max_select, sort_order, option_values(id, option_group_id, name, price_delta, sort_order))",
      )
      .eq("shop_id", shopId)
      .order("sort_order"),
  ]);

  const categories = ((cats.data ?? []) as Category[]).slice().sort(bySort);
  const products = ((prods.data ?? []) as unknown as ProductWithOptions[])
    .map((p) => ({
      ...p,
      base_price: Number(p.base_price),
      qty_step: Number(p.qty_step) || 1,
      details: p.details ?? {},
      option_groups: (p.option_groups ?? [])
        .slice()
        .sort(bySort)
        .map((g) => ({
          ...g,
          option_values: (g.option_values ?? []).slice().sort(bySort),
        })),
    }))
    .sort(bySort);

  return { categories, products };
});

export type PublicOrderItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
  options: OrderItemOption[];
  note: string | null;
  line_total: number;
  unit?: Unit;
};

export type PublicOrder = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  fulfillment: Fulfillment;
  delivery_area: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  shop: {
    id: string;
    slug: string;
    name: string;
    area: string | null;
    whatsapp_number: string;
    logo_url: string | null;
    cover_color: string;
  };
  items: PublicOrderItem[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Loads an order (with item snapshots) via the get_public_order RPC — totals come from the DB. */
export async function getPublicOrder(orderId: string): Promise<PublicOrder | null> {
  if (!UUID_RE.test(orderId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_order", { p_order_id: orderId });
  if (error || !data) return null;
  const order = data as PublicOrder;

  return {
    ...order,
    items: (order.items ?? []).map((i) => ({
      ...i,
      quantity: Number(i.quantity),
      options: i.options ?? [],
      unit: i.unit ?? "piece",
    })),
  };
}

/** The wa.me link to the SHOP's number with the order message, built from DB data only. */
export function orderWhatsAppUrl(order: PublicOrder): string {
  const message = buildOrderMessage({
    order_number: order.order_number,
    shop_name: order.shop.name,
    items: order.items.map((i) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit: i.unit,
      options: i.options,
      note: i.note,
      line_total: i.line_total,
    })),
    fulfillment: order.fulfillment,
    delivery_fee: order.delivery_fee,
    total: order.total,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    delivery_area: order.delivery_area,
    address: order.address,
    lat: order.lat,
    lng: order.lng,
    note: order.note,
  });
  return waLink(order.shop.whatsapp_number, message);
}
