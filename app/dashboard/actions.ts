"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireShopContext, requireShopOwnerContext } from "@/lib/auth";
import type { OrderStatus } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

// z.guid(): any 8-4-4-4-12 hex id (seed data may use non-RFC UUIDs).
const orderId = z.guid();
const statusSchema = z.enum(["new", "preparing", "out_for_delivery", "delivered", "rejected"]);

/** Which statuses an order may move to from its current status. */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  new: ["preparing", "rejected"],
  preparing: ["out_for_delivery", "delivered", "rejected"],
  out_for_delivery: ["delivered"],
  delivered: [],
  rejected: [],
};

function done() {
  // Refresh the whole dashboard tree (orders list, nav count badge, detail pages).
  revalidatePath("/dashboard", "layout");
}

/**
 * Move an order along the workflow. Uses the normal (cookie) server client so RLS
 * guarantees the order belongs to the signed-in shopkeeper's shop.
 */
export async function updateOrderStatus(id: string, status: OrderStatus): Promise<ActionResult> {
  const parsed = z.object({ id: orderId, status: statusSchema }).safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  const { supabase, shop } = await requireShopContext();
  const { data: current, error: readError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", parsed.data.id)
    .eq("shop_id", shop.id)
    .maybeSingle<{ status: OrderStatus }>();
  if (readError) return { ok: false, error: "Could not load the order" };
  if (!current) return { ok: false, error: "Order not found" };
  if (current.status === parsed.data.status) return { ok: true };
  if (!ALLOWED[current.status].includes(parsed.data.status)) {
    return { ok: false, error: "This order can't be moved to that status" };
  }

  // Accepting an order means the shopkeeper has seen it, so it is no longer "Unconfirmed".
  const patch: { status: OrderStatus; whatsapp_confirmed?: boolean } = { status: parsed.data.status };
  if (parsed.data.status === "preparing") patch.whatsapp_confirmed = true;

  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("shop_id", shop.id)
    .eq("status", current.status) // guard against a concurrent change
    .select("id");
  if (error) return { ok: false, error: "Could not update the order" };
  if (!data?.length) return { ok: false, error: "Order was changed elsewhere — refresh and try again" };

  done();
  return { ok: true };
}

/** "Received on WhatsApp": the shopkeeper confirms the customer's message arrived. */
export async function markWhatsAppConfirmed(id: string): Promise<ActionResult> {
  const parsed = orderId.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  const { supabase, shop } = await requireShopContext();
  const { data, error } = await supabase
    .from("orders")
    .update({ whatsapp_confirmed: true })
    .eq("id", parsed.data)
    .eq("shop_id", shop.id)
    .select("id");
  if (error) return { ok: false, error: "Could not update the order" };
  if (!data?.length) return { ok: false, error: "Order not found" };

  done();
  return { ok: true };
}

/** "Taking orders" toggle (owners and super admins only, not staff). */
export async function setShopOpen(isOpen: boolean): Promise<ActionResult> {
  const parsed = z.boolean().safeParse(isOpen);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  const { supabase, shop } = await requireShopOwnerContext();
  const { data, error } = await supabase
    .from("shops")
    .update({ is_open: parsed.data })
    .eq("id", shop.id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Could not update the shop" };

  done();
  revalidatePath(`/${shop.slug}`);
  return { ok: true };
}
