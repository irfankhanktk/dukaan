"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { generateTempPassword } from "@/lib/login";
import { createOrLinkOwner, loginDetailsWhatsAppLink, resetOwnerPassword } from "@/lib/owners";
import { toWhatsAppNumber } from "@/lib/format";
import type { Shop, ShopStatus } from "@/lib/types";
import { getAppUrl } from "@/components/admin/shop-detail/server-utils";
import { PAYMENT_METHODS } from "@/components/admin/shop-detail/shared";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const id = z.guid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

function firstError(err: z.ZodError) {
  return err.issues[0]?.message ?? "Invalid input";
}

function revalidateShop(shopId: string, slug?: string) {
  revalidatePath(`/admin/shops/${shopId}`);
  revalidatePath("/admin/shops");
  if (slug) revalidatePath(`/${slug}`);
}

/* ------------------------------------------------------------------ status */

const statusInput = z.object({
  shopId: id,
  status: z.enum(["active", "suspended", "payment_due"]),
});

/**
 * Suspend / reactivate / mark payment due. Written with the admin's own session,
 * so the database audit trigger records it with the admin's user id.
 */
export async function setShopStatus(input: {
  shopId: string;
  status: Extract<ShopStatus, "active" | "suspended" | "payment_due">;
}): Promise<Result> {
  const parsed = statusInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { supabase } = await requireSuperAdmin();

  const { data, error } = await supabase
    .from("shops")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.shopId)
    .select("id, slug")
    .maybeSingle<{ id: string; slug: string }>();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Shop not found." };

  revalidateShop(data.id, data.slug);
  return { ok: true };
}

/* ------------------------------------------------------------------- owner */

async function loadShop(supabase: Awaited<ReturnType<typeof requireSuperAdmin>>["supabase"], shopId: string) {
  const { data } = await supabase
    .from("shops")
    .select("id, slug, name, owner_id, status, paid_until")
    .eq("id", shopId)
    .maybeSingle<Pick<Shop, "id" | "slug" | "name" | "owner_id" | "status" | "paid_until">>();
  return data;
}

/** Give the owner a new temporary password and return a WhatsApp link to send it. */
export async function resetOwnerPasswordAction(
  shopId: string,
): Promise<Result<{ tempPassword: string; whatsappLink: string | null }>> {
  const parsedId = id.safeParse(shopId);
  if (!parsedId.success) return { ok: false, error: "Invalid shop" };
  const admin = await requireSuperAdmin();
  const shop = await loadShop(admin.supabase, parsedId.data);
  if (!shop) return { ok: false, error: "Shop not found." };
  if (!shop.owner_id) return { ok: false, error: "This shop has no owner login yet." };

  const { data: profile } = await admin.supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", shop.owner_id)
    .maybeSingle<{ full_name: string | null; phone: string | null }>();

  const tempPassword = generateTempPassword();
  const res = await resetOwnerPassword({
    actorId: admin.userId,
    shopId: shop.id,
    userId: shop.owner_id,
    tempPassword,
  });
  if (!res.ok) return res;

  const whatsappLink = profile?.phone
    ? loginDetailsWhatsAppLink({
        ownerPhone: profile.phone,
        ownerName: profile.full_name ?? "",
        shopName: shop.name,
        appUrl: await getAppUrl(),
        tempPassword,
      })
    : null;

  revalidatePath(`/admin/shops/${shop.id}`);
  return { ok: true, tempPassword, whatsappLink };
}

const ownerInput = z.object({
  shopId: id,
  fullName: z.string().trim().min(2, "Enter the owner's name").max(80),
  phone: z
    .string()
    .trim()
    .refine((v) => toWhatsAppNumber(v) !== null, "Enter a valid Pakistani mobile number"),
  contactEmail: z.union([z.literal(""), z.email("Enter a valid email")]).optional(),
  tempPassword: z.string().trim().min(8, "Temporary password must be at least 8 characters").max(72),
});

/** Create (or link an existing) login and make it the shop's owner. */
export async function changeOwnerAction(
  input: z.input<typeof ownerInput>,
): Promise<Result<{ created: boolean; loginPhone: string; tempPassword: string | null; whatsappLink: string | null }>> {
  const parsed = ownerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const admin = await requireSuperAdmin();
  const shop = await loadShop(admin.supabase, parsed.data.shopId);
  if (!shop) return { ok: false, error: "Shop not found." };

  const res = await createOrLinkOwner({
    actorId: admin.userId,
    shopId: shop.id,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    contactEmail: parsed.data.contactEmail || null,
    tempPassword: parsed.data.tempPassword,
  });
  if (!res.ok) return res;

  const whatsappLink = loginDetailsWhatsAppLink({
    ownerPhone: parsed.data.phone,
    ownerName: parsed.data.fullName,
    shopName: shop.name,
    appUrl: await getAppUrl(),
    tempPassword: res.tempPassword,
  });

  revalidateShop(shop.id);
  return {
    ok: true,
    created: res.created,
    loginPhone: res.loginPhone,
    tempPassword: res.tempPassword,
    whatsappLink,
  };
}

/* ----------------------------------------------------------------- billing */

const billingInput = z.object({
  shopId: id,
  plan: z.string().trim().min(1, "Enter a plan").max(40),
  monthlyFee: z.coerce.number().int("Fee must be whole rupees").min(0).max(1_000_000),
  paidUntil: z.union([z.literal(""), isoDate]),
});

export async function updateBillingAction(input: z.input<typeof billingInput>): Promise<Result> {
  const parsed = billingInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { supabase } = await requireSuperAdmin();

  const { data, error } = await supabase
    .from("shops")
    .update({
      plan: parsed.data.plan,
      monthly_fee: parsed.data.monthlyFee,
      paid_until: parsed.data.paidUntil || null,
    })
    .eq("id", parsed.data.shopId)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Shop not found." };

  revalidateShop(parsed.data.shopId);
  return { ok: true };
}

const paymentInput = z
  .object({
    shopId: id,
    amount: z.coerce.number().int("Amount must be whole rupees").positive("Enter the amount received").max(10_000_000),
    method: z.enum(PAYMENT_METHODS),
    periodStart: isoDate,
    periodEnd: isoDate,
    note: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.periodEnd >= v.periodStart, {
    message: "Period end must be on or after the start",
    path: ["periodEnd"],
  });

/**
 * Record a subscription payment, extend paid_until and lift "payment due".
 * Both writes use the admin's session → logged by the audit trigger.
 */
export async function recordPaymentAction(input: z.input<typeof paymentInput>): Promise<Result> {
  const parsed = paymentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const admin = await requireSuperAdmin();
  const shop = await loadShop(admin.supabase, parsed.data.shopId);
  if (!shop) return { ok: false, error: "Shop not found." };

  const { error } = await admin.supabase.from("subscription_payments").insert({
    shop_id: shop.id,
    amount: parsed.data.amount,
    method: parsed.data.method,
    period_start: parsed.data.periodStart,
    period_end: parsed.data.periodEnd,
    note: parsed.data.note || null,
    recorded_by: admin.userId,
  });
  if (error) return { ok: false, error: error.message };

  const paidUntil =
    shop.paid_until && shop.paid_until > parsed.data.periodEnd ? shop.paid_until : parsed.data.periodEnd;
  const update: { paid_until: string; status?: ShopStatus } = { paid_until: paidUntil };
  if (shop.status === "payment_due") update.status = "active";

  const { error: shopError } = await admin.supabase.from("shops").update(update).eq("id", shop.id);
  if (shopError) return { ok: false, error: `Payment saved, but the shop wasn't updated: ${shopError.message}` };

  revalidateShop(shop.id, shop.slug);
  return { ok: true };
}
