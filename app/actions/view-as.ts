"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSuperAdmin, VIEW_AS_COOKIE } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/**
 * "View as shopkeeper": the super admin keeps their OWN session and selects a shop context.
 * The cookie is only honoured for super admins (lib/auth.ts getShopContext); writes made
 * in this mode are recorded in audit_log by the database trigger with the admin's user id.
 */
export async function startViewAs(shopId: string, next?: unknown) {
  // `next` is optional; when this action is bound to a <form>, React passes FormData here instead.
  const target =
    typeof next === "string" && /^\/dashboard(\/[a-z0-9\-/]*)?$/.test(next) ? next : "/dashboard";
  const id = z.guid().parse(shopId);
  const admin = await requireSuperAdmin();
  const { data: shop } = await admin.supabase.from("shops").select("id").eq("id", id).maybeSingle();
  if (!shop) throw new Error("Shop not found");

  (await cookies()).set(VIEW_AS_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  await logAudit({ actorId: admin.userId, shopId: id, action: "shop.view_as", entity: "shop", entityId: id });
  redirect(target);
}

export async function exitViewAs() {
  const store = await cookies();
  const shopId = store.get(VIEW_AS_COOKIE)?.value;
  store.delete(VIEW_AS_COOKIE);
  redirect(shopId ? `/admin/shops/${shopId}` : "/admin/shops");
}
