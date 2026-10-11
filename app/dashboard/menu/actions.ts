"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireShopOwnerContext } from "@/lib/auth";
import type { Shop } from "@/lib/types";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

// z.guid() accepts any 8-4-4-4-12 hex id (seed data may not be RFC-variant UUIDs).
const idSchema = z.guid("Invalid id");
const PHOTO_BUCKET = "product-photos";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const valueSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1, "Every choice needs a name").max(60, "Choice names must be 60 characters or less"),
  price_delta: z
    .number("Extra price must be a number")
    .int("Extra price must be whole rupees")
    .min(-1_000_000)
    .max(1_000_000),
});

const groupSchema = z
  .object({
    id: idSchema.optional(),
    name: z.string().trim().min(1, "Every option group needs a name").max(40, "Group names must be 40 characters or less"),
    type: z.enum(["single", "multiple", "text"]),
    is_required: z.boolean(),
    min_select: z.number().int().min(0).max(50).default(0),
    max_select: z.number().int().min(1).max(50).nullable().optional(),
    values: z.array(valueSchema).max(30, "Too many choices in one group").default([]),
  })
  .superRefine((g, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    if (g.type === "text") {
      if (g.values.length > 0) issue(`"${g.name}" is a text group and can't have choices`);
      return;
    }
    if (g.values.length === 0) {
      issue(`Add at least one choice to "${g.name}"`);
      return;
    }
    if (g.type === "multiple") {
      const max = g.max_select ?? null;
      if (max !== null && max > g.values.length) {
        issue(`"${g.name}": "up to" can't be more than the number of choices (${g.values.length})`);
      }
      const min = g.is_required ? Math.max(1, g.min_select) : g.min_select;
      if (min > (max ?? g.values.length)) {
        issue(`"${g.name}": customers must pick more choices than are allowed`);
      }
    }
    const names = new Set<string>();
    for (const v of g.values) {
      const key = v.name.toLowerCase();
      if (names.has(key)) issue(`"${g.name}" has the choice "${v.name}" twice`);
      names.add(key);
    }
  });

const productSchema = z
  .object({
    id: idSchema.optional(),
    name: z.string().trim().min(1, "Product name is required").max(80, "Product name is too long"),
    description: z.string().trim().max(500, "Description is too long").nullable().optional(),
    category_id: idSchema.nullable().optional(),
    new_category_name: z.string().trim().max(40, "Category name is too long").nullable().optional(),
    base_price: z
      .number("Price must be a number")
      .int("Price must be whole rupees")
      .min(0, "Price can't be negative")
      .max(10_000_000, "Price is too high"),
    unit: z.enum(["piece", "kg", "dozen", "box"]),
    qty_step: z.number().positive("Quantity step must be more than 0").max(100),
    photo_url: z.string().trim().url("Invalid photo").max(1000).nullable().optional(),
    is_available: z.boolean(),
    details: z
      .record(
        z.string().trim().min(1).max(40, "Detail names must be 40 characters or less"),
        z.string().trim().min(1).max(120, "Detail values must be 120 characters or less"),
      )
      .default({}),
    option_groups: z.array(groupSchema).max(15, "Too many option groups").default([]),
  })
  .superRefine((p, ctx) => {
    if (Object.keys(p.details).length > 12) {
      ctx.addIssue({ code: "custom", message: "Up to 12 details per product" });
    }
    if (Math.round(p.qty_step * 100) !== p.qty_step * 100) {
      ctx.addIssue({ code: "custom", message: "Quantity step can have at most 2 decimals" });
    }
    const names = new Set<string>();
    for (const g of p.option_groups) {
      const key = g.name.toLowerCase();
      if (names.has(key)) ctx.addIssue({ code: "custom", message: `Two option groups are called "${g.name}"` });
      names.add(key);
    }
  });

export type SaveProductInput = z.input<typeof productSchema>;
type ParsedGroup = z.output<typeof groupSchema>;

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "Category name is required")
  .max(40, "Category name is too long");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form";
}

function revalidateMenu(shop: Pick<Shop, "slug">) {
  revalidatePath("/dashboard/menu");
  revalidatePath(`/${shop.slug}`);
}

/** Public URL prefix for files in this shop's photo folder. */
function shopPhotoPrefix(shopId: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${shopId}/`;
}

/** Storage path ("<shop_id>/<file>") for a URL in this shop's folder, else null. */
function shopPhotoPath(url: string | null | undefined, shopId: string): string | null {
  if (!url) return null;
  const prefix = shopPhotoPrefix(shopId);
  if (!url.startsWith(prefix)) return null;
  const file = url.slice(prefix.length).split("?")[0];
  if (!file || file.includes("/") || file.includes("..")) return null;
  return `${shopId}/${file}`;
}

/** Normalised min/max per the group type (keeps place_order's checks consistent). */
function normaliseGroup(g: ParsedGroup) {
  if (g.type === "text") {
    return { min_select: 0, max_select: null as number | null, is_required: g.is_required, values: [] };
  }
  if (g.type === "single") {
    return { min_select: g.is_required ? 1 : 0, max_select: 1, is_required: g.is_required, values: g.values };
  }
  const min = g.is_required ? Math.max(1, g.min_select) : g.min_select;
  return {
    min_select: min,
    max_select: g.max_select ?? null,
    is_required: g.is_required || min > 0,
    values: g.values,
  };
}

type Supabase = Awaited<ReturnType<typeof requireShopOwnerContext>>["supabase"];

async function nextSortOrder(supabase: Supabase, table: "products" | "categories", shopId: string) {
  const { data } = await supabase
    .from(table)
    .select("sort_order")
    .eq("shop_id", shopId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  return (data?.sort_order ?? -1) + 1;
}

/** Find a category by name (case-insensitive) or create it. */
async function findOrCreateCategory(supabase: Supabase, shopId: string, name: string) {
  const { data: existing } = await supabase
    .from("categories")
    .select("id, name")
    .eq("shop_id", shopId);
  const match = (existing ?? []).find(
    (c: { id: string; name: string }) => c.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (match) return { id: match.id as string, error: null };
  const sort_order = await nextSortOrder(supabase, "categories", shopId);
  const { data, error } = await supabase
    .from("categories")
    .insert({ shop_id: shopId, name, sort_order })
    .select("id")
    .single<{ id: string }>();
  return { id: data?.id ?? null, error };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function saveProduct(input: SaveProductInput): Promise<ActionResult<{ id: string }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const p = parsed.data;

  const { supabase, shop } = await requireShopOwnerContext();

  // Existing product (for updates) — scoped to this shop.
  let existingPhoto: string | null = null;
  if (p.id) {
    const { data: existing } = await supabase
      .from("products")
      .select("id, photo_url")
      .eq("id", p.id)
      .eq("shop_id", shop.id)
      .maybeSingle<{ id: string; photo_url: string | null }>();
    if (!existing) return { ok: false, error: "Product not found" };
    existingPhoto = existing.photo_url;
  }

  // Photo must be in this shop's storage folder (or unchanged / removed).
  const photoUrl = p.photo_url || null;
  if (photoUrl && photoUrl !== existingPhoto && !shopPhotoPath(photoUrl, shop.id)) {
    return { ok: false, error: "Please upload the photo again" };
  }

  // Category: existing (verified to belong to this shop) or new by name.
  let categoryId: string | null = null;
  const newCategory = p.new_category_name?.trim();
  if (newCategory) {
    const { id, error } = await findOrCreateCategory(supabase, shop.id, newCategory);
    if (error || !id) return { ok: false, error: "Could not create the category" };
    categoryId = id;
  } else if (p.category_id) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("id", p.category_id)
      .eq("shop_id", shop.id)
      .maybeSingle();
    if (!cat) return { ok: false, error: "Category not found" };
    categoryId = p.category_id;
  }

  const row = {
    name: p.name,
    description: p.description || null,
    category_id: categoryId,
    base_price: p.base_price,
    unit: p.unit,
    qty_step: p.unit === "kg" ? p.qty_step : 1,
    photo_url: photoUrl,
    is_available: p.is_available,
    details: p.details,
  };

  let productId: string;
  if (p.id) {
    const { data, error } = await supabase
      .from("products")
      .update(row)
      .eq("id", p.id)
      .eq("shop_id", shop.id)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error || !data) return { ok: false, error: "Could not save the product" };
    productId = data.id;
  } else {
    const sort_order = await nextSortOrder(supabase, "products", shop.id);
    const { data, error } = await supabase
      .from("products")
      .insert({ ...row, shop_id: shop.id, sort_order })
      .select("id")
      .single<{ id: string }>();
    if (error || !data) return { ok: false, error: "Could not create the product" };
    productId = data.id;
  }

  const syncError = await syncOptionGroups(supabase, productId, p.option_groups);
  if (syncError) {
    revalidateMenu(shop);
    return { ok: false, error: syncError };
  }

  // Replaced/removed photo: clean up the old file (best effort).
  if (p.id && existingPhoto && existingPhoto !== photoUrl) {
    const oldPath = shopPhotoPath(existingPhoto, shop.id);
    if (oldPath) await supabase.storage.from(PHOTO_BUCKET).remove([oldPath]);
  }

  revalidateMenu(shop);
  return { ok: true, data: { id: productId } };
}

/**
 * Make the product's option groups/values match `groups`: update rows whose id
 * already exists, insert new ones, delete the ones that were removed. Ids of
 * kept rows stay stable. Returns an error message or null.
 */
async function syncOptionGroups(
  supabase: Supabase,
  productId: string,
  groups: ParsedGroup[],
): Promise<string | null> {
  const { data: existing, error: loadError } = await supabase
    .from("option_groups")
    .select("id, option_values(id)")
    .eq("product_id", productId);
  if (loadError) return "Could not load option groups";

  const existingValues = new Map<string, Set<string>>();
  for (const g of (existing ?? []) as { id: string; option_values: { id: string }[] }[]) {
    existingValues.set(g.id, new Set((g.option_values ?? []).map((v) => v.id)));
  }

  const keptGroupIds = new Set(
    groups.map((g) => g.id).filter((id): id is string => !!id && existingValues.has(id)),
  );
  const removedGroups = [...existingValues.keys()].filter((id) => !keptGroupIds.has(id));
  if (removedGroups.length) {
    const { error } = await supabase
      .from("option_groups")
      .delete()
      .eq("product_id", productId)
      .in("id", removedGroups);
    if (error) return "Could not remove option groups";
  }

  for (const [index, g] of groups.entries()) {
    const n = normaliseGroup(g);
    const groupRow = {
      name: g.name,
      type: g.type,
      is_required: n.is_required,
      min_select: n.min_select,
      max_select: n.max_select,
      sort_order: index,
    };

    let groupId: string;
    if (g.id && keptGroupIds.has(g.id)) {
      const { error } = await supabase
        .from("option_groups")
        .update(groupRow)
        .eq("id", g.id)
        .eq("product_id", productId);
      if (error) return `Could not save "${g.name}"`;
      groupId = g.id;
    } else {
      const { data, error } = await supabase
        .from("option_groups")
        .insert({ ...groupRow, product_id: productId })
        .select("id")
        .single<{ id: string }>();
      if (error || !data) return `Could not save "${g.name}"`;
      groupId = data.id;
    }

    const oldValueIds = existingValues.get(groupId) ?? new Set<string>();
    const keptValueIds = new Set(
      n.values.map((v) => v.id).filter((id): id is string => !!id && oldValueIds.has(id)),
    );
    const removedValues = [...oldValueIds].filter((id) => !keptValueIds.has(id));
    if (removedValues.length) {
      const { error } = await supabase
        .from("option_values")
        .delete()
        .eq("option_group_id", groupId)
        .in("id", removedValues);
      if (error) return `Could not update choices for "${g.name}"`;
    }

    const updates = n.values
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => v.id && keptValueIds.has(v.id))
      .map(({ v, i }) =>
        supabase
          .from("option_values")
          .update({ name: v.name, price_delta: v.price_delta, sort_order: i })
          .eq("id", v.id!)
          .eq("option_group_id", groupId),
      );
    const inserts = n.values
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => !(v.id && keptValueIds.has(v.id)))
      .map(({ v, i }) => ({
        option_group_id: groupId,
        name: v.name,
        price_delta: v.price_delta,
        sort_order: i,
      }));

    const results = await Promise.all([
      ...updates,
      ...(inserts.length ? [supabase.from("option_values").insert(inserts)] : []),
    ]);
    if (results.some((r) => r.error)) return `Could not save choices for "${g.name}"`;
  }

  return null;
}

export async function toggleAvailability(
  productId: string,
  available: boolean,
): Promise<ActionResult> {
  const parsed = z.object({ productId: idSchema, available: z.boolean() }).safeParse({ productId, available });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { supabase, shop } = await requireShopOwnerContext();
  const { data, error } = await supabase
    .from("products")
    .update({ is_available: parsed.data.available })
    .eq("id", parsed.data.productId)
    .eq("shop_id", shop.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not update the product" };

  revalidateMenu(shop);
  return { ok: true, data: null };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(productId);
  if (!parsed.success) return { ok: false, error: "Product not found" };

  const { supabase, shop } = await requireShopOwnerContext();
  // Old orders keep their snapshot; order_items.product_id becomes null.
  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", parsed.data)
    .eq("shop_id", shop.id)
    .select("id, photo_url")
    .maybeSingle<{ id: string; photo_url: string | null }>();
  if (error || !data) return { ok: false, error: "Could not delete the product" };

  const photoPath = shopPhotoPath(data.photo_url, shop.id);
  if (photoPath) await supabase.storage.from(PHOTO_BUCKET).remove([photoPath]);

  revalidateMenu(shop);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(name: string): Promise<ActionResult<{ id: string }>> {
  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { supabase, shop } = await requireShopOwnerContext();
  const { id, error } = await findOrCreateCategory(supabase, shop.id, parsed.data);
  if (error || !id) return { ok: false, error: "Could not create the category" };

  revalidateMenu(shop);
  return { ok: true, data: { id } };
}

export async function renameCategory(categoryId: string, name: string): Promise<ActionResult> {
  const parsed = z.object({ id: idSchema, name: categoryNameSchema }).safeParse({ id: categoryId, name });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { supabase, shop } = await requireShopOwnerContext();
  const { data, error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id)
    .eq("shop_id", shop.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not rename the category" };

  revalidateMenu(shop);
  return { ok: true, data: null };
}

/** Deletes a category; its products become uncategorised. */
export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  const parsed = idSchema.safeParse(categoryId);
  if (!parsed.success) return { ok: false, error: "Category not found" };

  const { supabase, shop } = await requireShopOwnerContext();
  // Explicit (the FK is ON DELETE SET NULL too) so it also works under RLS semantics.
  const { error: unlinkError } = await supabase
    .from("products")
    .update({ category_id: null })
    .eq("shop_id", shop.id)
    .eq("category_id", parsed.data);
  if (unlinkError) return { ok: false, error: "Could not delete the category" };

  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", parsed.data)
    .eq("shop_id", shop.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Could not delete the category" };

  revalidateMenu(shop);
  return { ok: true, data: null };
}
