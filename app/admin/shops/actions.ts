"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { toWhatsAppNumber } from "@/lib/format";
import { createOrLinkOwner, loginDetailsWhatsAppLink } from "@/lib/owners";
import { BUSINESS_TYPES, DAY_KEYS, type Shop } from "@/lib/types";
import {
  applyMenuTemplate,
  insertMenuRows,
  slugProblem,
  UNITS,
  type MenuRow,
} from "@/lib/menu-import";
import { getAppUrl } from "@/components/admin/wizard/app-url";

/**
 * Register-shop wizard + shops import. Every action checks the caller is a super admin and
 * writes through the admin's OWN session client, so RLS applies and the database audit
 * trigger records each write with the admin's user id. Only owner logins (auth users) go
 * through the service key, inside lib/owners.ts.
 */

export type ActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

type Supa = Awaited<ReturnType<typeof requireSuperAdmin>>["supabase"];

const idSchema = z.guid();

function fail(error: string, fieldErrors?: Record<string, string>): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  return { ok: false, error, fieldErrors };
}

function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

async function getShop(supabase: Supa, shopId: string) {
  const id = idSchema.parse(shopId);
  const { data, error } = await supabase.from("shops").select("*").eq("id", id).maybeSingle<Shop>();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Shop not found");
  return data;
}

/** onboarding_step = max(current, step) */
async function advanceTo(supabase: Supa, shop: Pick<Shop, "id" | "onboarding_step">, step: number) {
  if (shop.onboarding_step >= step) return;
  await supabase.from("shops").update({ onboarding_step: Math.min(5, step) }).eq("id", shop.id);
}

function revalidateShop(shop: { id: string; slug?: string | null }) {
  revalidatePath("/admin/shops");
  revalidatePath(`/admin/shops/${shop.id}`, "layout");
  if (shop.slug) revalidatePath(`/${shop.slug}`);
}

// ---------------------------------------------------------------------------
// Step 1: shop details
// ---------------------------------------------------------------------------

export async function checkSlugAvailability(
  slug: string,
  shopId?: string | null,
): Promise<{ available: boolean; message: string }> {
  const { supabase } = await requireSuperAdmin();
  const s = String(slug ?? "").trim().toLowerCase();
  const problem = slugProblem(s);
  if (problem) return { available: false, message: problem };
  const { data } = await supabase.from("shops").select("id").eq("slug", s).maybeSingle();
  if (data && data.id !== shopId) return { available: false, message: "This link is already taken" };
  return { available: true, message: "Available" };
}

const detailsSchema = z.object({
  shopId: z.guid().nullish(),
  requestId: z.guid().nullish(),
  name: z.string().trim().min(2, "Shop name is too short").max(80, "Shop name is too long"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .superRefine((v, ctx) => {
      const p = slugProblem(v);
      if (p) ctx.addIssue({ code: "custom", message: p });
    }),
  business_type: z.enum(BUSINESS_TYPES, { error: "Choose a business type" }),
  whatsapp_number: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const wa = toWhatsAppNumber(v);
      if (!wa) {
        ctx.addIssue({ code: "custom", message: "Enter a mobile number like 0300 1234567" });
        return z.NEVER;
      }
      return wa;
    }),
  city: z.string().trim().max(60, "City is too long"),
  area: z.string().trim().max(160, "Area is too long"),
  cover_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Pick a colour"),
  logo_url: z.string().url().max(500).nullish(),
});

export type DetailsInput = z.input<typeof detailsSchema>;

export async function saveShopDetails(input: DetailsInput): Promise<ActionResult> {
  const { supabase } = await requireSuperAdmin();
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;

  const fields = {
    name: v.name,
    slug: v.slug,
    business_type: v.business_type,
    whatsapp_number: v.whatsapp_number,
    city: v.city || null,
    area: v.area || null,
    cover_color: v.cover_color.toUpperCase(),
  };

  // Slug must be free (the unique index is the final word, see 23505 below).
  const { data: clash } = await supabase.from("shops").select("id").eq("slug", v.slug).maybeSingle();
  if (clash && clash.id !== v.shopId) {
    return fail("This shop link is already taken.", { slug: "This link is already taken" });
  }

  let shopId: string;
  if (v.shopId) {
    const shop = await getShop(supabase, v.shopId);
    const logoUrl =
      v.logo_url && v.logo_url.includes(`/product-photos/${shop.id}/`) ? v.logo_url : v.logo_url ? shop.logo_url : null;
    const { error } = await supabase
      .from("shops")
      .update({ ...fields, logo_url: logoUrl })
      .eq("id", shop.id);
    if (error) {
      if (error.code === "23505") return fail("This shop link is already taken.", { slug: "This link is already taken" });
      return fail(error.message);
    }
    await advanceTo(supabase, shop, 2);
    revalidateShop({ id: shop.id, slug: shop.slug });
    if (shop.slug !== v.slug) revalidatePath(`/${v.slug}`);
    shopId = shop.id;
  } else {
    const { data, error } = await supabase
      .from("shops")
      .insert({ ...fields, status: "setup", onboarding_step: 2 })
      .select("id")
      .single();
    if (error || !data) {
      if (error?.code === "23505") return fail("This shop link is already taken.", { slug: "This link is already taken" });
      return fail(error?.message ?? "Could not create the shop.");
    }
    shopId = data.id;

    if (v.requestId) {
      await supabase
        .from("shop_requests")
        .update({ converted_shop_id: shopId, status: "registered" })
        .eq("id", v.requestId);
      revalidatePath("/admin/requests");
    }
    revalidatePath("/admin/shops");
  }

  redirect(`/admin/shops/${shopId}/setup?step=2`);
}

// ---------------------------------------------------------------------------
// Step 2: owner account
// ---------------------------------------------------------------------------

const ownerSchema = z.object({
  shopId: z.guid(),
  fullName: z.string().trim().min(2, "Enter the owner's name").max(80, "Name is too long"),
  phone: z
    .string()
    .trim()
    .refine((v) => !!toWhatsAppNumber(v), "Enter a mobile number like 0300 1234567"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email or leave it empty")]),
  tempPassword: z
    .string()
    .trim()
    .min(8, "Use at least 8 characters")
    .max(72, "Password is too long"),
});

export type OwnerInput = z.input<typeof ownerSchema>;

export type OwnerSaved = {
  created: boolean;
  ownerName: string;
  loginPhone: string;
  tempPassword: string | null;
  whatsappLink: string | null;
  loginUrl: string;
};

export async function saveOwner(input: OwnerInput): Promise<ActionResult<OwnerSaved>> {
  const admin = await requireSuperAdmin();
  const parsed = ownerSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const shop = await getShop(admin.supabase, v.shopId);

  const result = await createOrLinkOwner({
    actorId: admin.userId,
    shopId: shop.id,
    fullName: v.fullName,
    phone: v.phone,
    contactEmail: v.email || null,
    tempPassword: v.tempPassword,
  });
  if (!result.ok) return fail(result.error);

  await advanceTo(admin.supabase, shop, 3);
  revalidateShop(shop);

  const appUrl = await getAppUrl();
  return {
    ok: true,
    created: result.created,
    ownerName: v.fullName,
    loginPhone: result.loginPhone,
    tempPassword: result.tempPassword,
    loginUrl: `${appUrl}/auth/login`,
    whatsappLink: loginDetailsWhatsAppLink({
      ownerPhone: v.phone,
      ownerName: v.fullName,
      shopName: shop.name,
      appUrl,
      tempPassword: result.tempPassword,
    }),
  };
}

// ---------------------------------------------------------------------------
// Step 3: delivery & hours
// ---------------------------------------------------------------------------

const rupees = (label: string) =>
  z.coerce
    .number({ error: `${label} must be a number` })
    .int(`${label} must be whole rupees`)
    .min(0, `${label} can't be negative`)
    .max(1_000_000, `${label} is too large`);

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 09:00");

const daySchema = z.object({ open: timeSchema, close: timeSchema, closed: z.boolean() });

const deliverySchema = z.object({
  shopId: z.guid(),
  mode: z.enum(["flat", "areas"]),
  delivery_fee: rupees("Delivery fee"),
  delivery_areas: z
    .array(z.object({ name: z.string().trim().min(1, "Area name is missing").max(60), fee: rupees("Area fee") }))
    .max(50, "At most 50 areas"),
  min_order: rupees("Minimum order"),
  pickup_enabled: z.boolean(),
  prep_time: z.string().trim().max(40, "Keep it short, e.g. 30–45 min"),
  days: z.object(Object.fromEntries(DAY_KEYS.map((d) => [d, daySchema])) as Record<(typeof DAY_KEYS)[number], typeof daySchema>),
});

export type DeliveryInput = z.input<typeof deliverySchema>;

export async function saveDeliveryHours(input: DeliveryInput): Promise<ActionResult> {
  const { supabase } = await requireSuperAdmin();
  const parsed = deliverySchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  if (v.mode === "areas" && v.delivery_areas.length === 0) {
    return fail("Add at least one delivery area, or use a flat fee.", { delivery_areas: "Add at least one area" });
  }
  const names = v.delivery_areas.map((a) => a.name.toLowerCase());
  if (new Set(names).size !== names.length) {
    return fail("Each delivery area must have a different name.", { delivery_areas: "Duplicate area name" });
  }
  const shop = await getShop(supabase, v.shopId);

  const { error } = await supabase
    .from("shops")
    .update({
      delivery_fee: v.mode === "flat" ? v.delivery_fee : 0,
      delivery_areas: v.mode === "areas" ? v.delivery_areas : [],
      min_order: v.min_order,
      pickup_enabled: v.pickup_enabled,
      opening_hours: { ...(v.prep_time ? { prep_time: v.prep_time } : {}), days: v.days },
    })
    .eq("id", shop.id);
  if (error) return fail(error.message);

  await advanceTo(supabase, shop, 4);
  revalidateShop(shop);
  redirect(`/admin/shops/${shop.id}/setup?step=4`);
}

// ---------------------------------------------------------------------------
// Step 4: menu
// ---------------------------------------------------------------------------

export async function applyTemplate(
  shopId: string,
  templateId: string,
): Promise<ActionResult<{ added: number; skipped: number }>> {
  const { supabase } = await requireSuperAdmin();
  const shop = await getShop(supabase, shopId);
  const { data: template } = await supabase
    .from("menu_templates")
    .select("id, items")
    .eq("id", idSchema.parse(templateId))
    .maybeSingle();
  if (!template) return fail("Template not found.");
  try {
    const res = await applyMenuTemplate(supabase, shop.id, template);
    revalidateShop(shop);
    return { ok: true, ...res };
  } catch (e) {
    revalidateShop(shop);
    return fail(e instanceof Error ? e.message : "Could not apply the template.");
  }
}

const menuRowSchema = z.object({
  name: z.string().trim().min(1, "Name is missing").max(100, "Name is too long"),
  category: z.string().trim().max(60, "Category is too long").transform((c) => c || "Menu"),
  price: z.coerce.number().int("Price must be whole rupees").min(0).max(10_000_000),
  unit: z.enum(UNITS as [MenuRow["unit"], ...MenuRow["unit"][]]),
  description: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((d) => d || null),
});

/** CSV import and the quick-add table. Creates missing categories; skips existing names. */
export async function addMenuRows(
  shopId: string,
  rows: unknown,
): Promise<ActionResult<{ added: number; skipped: number }>> {
  const { supabase } = await requireSuperAdmin();
  const parsed = z.array(menuRowSchema).min(1, "Nothing to add").max(500, "At most 500 rows").safeParse(rows);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const row = typeof issue?.path[0] === "number" ? ` (row ${issue.path[0] + 1})` : "";
    return fail(`${issue?.message ?? "Invalid rows"}${row}`);
  }
  const shop = await getShop(supabase, shopId);
  try {
    const res = await insertMenuRows(supabase, shop.id, parsed.data);
    revalidateShop(shop);
    return { ok: true, ...res };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not add products.");
  }
}

const productPatchSchema = z
  .object({
    name: z.string().trim().min(1, "Name is missing").max(100),
    base_price: z.coerce.number().int().min(0).max(10_000_000),
    category_id: z.guid().nullable(),
    is_available: z.boolean(),
  })
  .partial();

export async function updateProductInline(
  shopId: string,
  productId: string,
  patch: z.input<typeof productPatchSchema>,
): Promise<ActionResult> {
  const { supabase } = await requireSuperAdmin();
  const parsed = productPatchSchema.safeParse(patch);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid change");
  const shop = await getShop(supabase, shopId);
  if (parsed.data.category_id) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("id", parsed.data.category_id)
      .eq("shop_id", shop.id)
      .maybeSingle();
    if (!cat) return fail("Category not found.");
  }
  const { error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", idSchema.parse(productId))
    .eq("shop_id", shop.id);
  if (error) return fail(error.message);
  revalidateShop(shop);
  return { ok: true };
}

export async function deleteProductInline(shopId: string, productId: string): Promise<ActionResult> {
  const { supabase } = await requireSuperAdmin();
  const shop = await getShop(supabase, shopId);
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", idSchema.parse(productId))
    .eq("shop_id", shop.id);
  if (error) return fail(error.message);
  revalidateShop(shop);
  return { ok: true };
}

export async function finishMenuStep(shopId: string): Promise<ActionResult> {
  const { supabase } = await requireSuperAdmin();
  const shop = await getShop(supabase, shopId);
  await advanceTo(supabase, shop, 5);
  revalidateShop(shop);
  redirect(`/admin/shops/${shop.id}/setup?step=5`);
}

// ---------------------------------------------------------------------------
// Step 5: go live + QR
// ---------------------------------------------------------------------------

const goLiveSchema = z.object({
  shopId: z.guid(),
  status: z.enum(["trial", "active"]),
  monthly_fee: rupees("Monthly fee"),
  paid_until: z.union([z.literal(""), z.iso.date("Pick a valid date")]),
});

export type GoLiveInput = z.input<typeof goLiveSchema>;

export async function goLive(input: GoLiveInput): Promise<ActionResult> {
  const { supabase } = await requireSuperAdmin();
  const parsed = goLiveSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const shop = await getShop(supabase, v.shopId);

  const [{ count: owners }, { count: products }] = await Promise.all([
    supabase
      .from("shop_members")
      .select("user_id", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .eq("role", "owner"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
  ]);
  if (!owners) return fail("Create the owner's login (step 2) before going live.");
  if (!products) return fail("Add at least one product (step 4) before going live.");

  const { error } = await supabase
    .from("shops")
    .update({
      status: v.status,
      plan: "standard",
      monthly_fee: v.monthly_fee,
      paid_until: v.paid_until || null,
      onboarding_step: 5,
      went_live_at: shop.went_live_at ?? new Date().toISOString(),
    })
    .eq("id", shop.id);
  if (error) return fail(error.message);

  revalidateShop(shop);
  redirect(`/admin/shops/${shop.id}`);
}

export async function setQrPlaced(shopId: string, placed: boolean): Promise<ActionResult> {
  const { supabase } = await requireSuperAdmin();
  const shop = await getShop(supabase, shopId);
  const { error } = await supabase
    .from("shops")
    .update({ qr_placed_at: placed ? new Date().toISOString() : null })
    .eq("id", shop.id);
  if (error) return fail(error.message);
  revalidateShop(shop);
  revalidatePath(`/admin/shops/${shop.id}/qr`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Bulk shop import (CSV)
// ---------------------------------------------------------------------------

const importRowSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine((s) => !slugProblem(s), "Invalid link"),
  business_type: z.enum(BUSINESS_TYPES),
  city: z.string().trim().max(60).nullable(),
  area: z.string().trim().max(160).nullable(),
  whatsapp_number: z.string().regex(/^92[0-9]{10}$/, "Invalid WhatsApp number"),
  owner_name: z.string().trim().max(80).nullable(),
  owner_phone: z.string().nullable(),
});

/** Which of these slugs are already used by a shop. */
export async function findTakenSlugs(slugs: string[]): Promise<string[]> {
  const { supabase } = await requireSuperAdmin();
  const list = z.array(z.string().max(60)).max(500).parse(slugs);
  if (!list.length) return [];
  const { data } = await supabase.from("shops").select("slug").in("slug", list);
  return (data ?? []).map((r) => r.slug as string);
}

export async function importShops(
  rows: unknown,
): Promise<ActionResult<{ created: { slug: string; id: string }[]; failed: { slug: string; error: string }[] }>> {
  const { supabase } = await requireSuperAdmin();
  const parsed = z.array(importRowSchema).min(1, "Nothing to import").max(200).safeParse(rows);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid rows");

  const created: { slug: string; id: string }[] = [];
  const failed: { slug: string; error: string }[] = [];
  for (const r of parsed.data) {
    const { data, error } = await supabase
      .from("shops")
      .insert({
        name: r.name,
        slug: r.slug,
        business_type: r.business_type,
        city: r.city,
        area: r.area,
        whatsapp_number: r.whatsapp_number,
        status: "setup",
        onboarding_step: 1,
      })
      .select("id")
      .single();
    if (error || !data) {
      failed.push({ slug: r.slug, error: error?.code === "23505" ? "Link already taken" : (error?.message ?? "Failed") });
    } else {
      created.push({ slug: r.slug, id: data.id });
    }
  }
  revalidatePath("/admin/shops");
  return { ok: true, created, failed };
}
