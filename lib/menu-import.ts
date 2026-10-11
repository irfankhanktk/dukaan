import type { SupabaseClient } from "@supabase/supabase-js";
import { toWhatsAppNumber } from "./format";
import { BUSINESS_TYPES, type BusinessType, type MenuTemplate, type Unit } from "./types";

/**
 * Helpers for the register-shop wizard: slugs, CSV parsing (menu + bulk shop import)
 * and inserting menus (template / CSV / quick-add). Parsing helpers are pure and safe in
 * client components; the insert helpers take a Supabase client (pass the super admin's
 * SESSION client so RLS and the audit trigger apply).
 */

// ---------------------------------------------------------------------------
// Slugs + labels
// ---------------------------------------------------------------------------

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const RESERVED_SLUGS = new Set([
  "admin",
  "dashboard",
  "auth",
  "api",
  "login",
  "actions",
  "_next",
  "sw.js",
  "manifest.webmanifest",
  "icons",
  "offline.html",
  "apple-touch-icon.png",
]);

/** "Ali Bakers & Sweets" → "ali-bakers-sweets" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

/** null if fine, otherwise a reason. Does not check the database. */
export function slugProblem(slug: string): string | null {
  if (slug.length < 3) return "Use at least 3 characters";
  if (slug.length > 48) return "Use at most 48 characters";
  if (!SLUG_RE.test(slug)) return "Only lowercase letters, numbers and single dashes";
  if (RESERVED_SLUGS.has(slug)) return "This link is reserved";
  return null;
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  restaurant: "Restaurant",
  bakery: "Bakery / sweets",
  home_kitchen: "Home kitchen",
  grocery: "Grocery / kiryana",
  pharmacy: "Pharmacy",
  stationery: "Stationery",
  clothing: "Clothing",
  other: "Other",
};

export const UNITS: Unit[] = ["piece", "kg", "dozen", "box"];

export function qtyStepFor(unit: Unit): number {
  return unit === "kg" ? 0.5 : 1;
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** RFC-4180-ish CSV parser: quoted fields, "" escapes, CRLF/LF. Also accepts tab-separated (pasted from a sheet). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = !firstLine.includes(",") && firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === "") quoted = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows
    .map((r) => r.map((f) => f.trim()))
    .filter((r) => r.some((f) => f !== ""));
}

/** Rows as objects keyed by lower-cased header. Returns the header too. */
function csvObjects(text: string): { header: string[]; records: { line: number; get: (k: string) => string }[] } {
  const rows = parseCsv(text);
  if (!rows.length) return { header: [], records: [] };
  const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const records = rows.slice(1).map((r, i) => ({
    line: i + 2,
    get: (k: string) => {
      const idx = header.indexOf(k);
      return idx >= 0 ? (r[idx] ?? "").trim() : "";
    },
  }));
  return { header, records };
}

/** "Rs 1,200" / "1200" / "1,200.00" → 1200; null if not a whole non-negative number. */
export function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/rs\.?/i, "").replace(/[,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > 10_000_000) return null;
  return Math.round(n);
}

export function parseUnit(raw: string): Unit | null {
  const v = raw.trim().toLowerCase();
  if (!v) return "piece";
  if (["piece", "pieces", "pc", "pcs", "each"].includes(v)) return "piece";
  if (["kg", "kilo", "kgs"].includes(v)) return "kg";
  if (["dozen", "dz", "doz"].includes(v)) return "dozen";
  if (["box", "boxes"].includes(v)) return "box";
  return null;
}

export type MenuRow = {
  name: string;
  category: string;
  price: number;
  unit: Unit;
  description: string | null;
};

export type ParsedMenuRow = { line: number; row: MenuRow | null; raw: Record<string, string>; errors: string[] };

export const MENU_CSV_HEADER = "name,category,price,unit,description";

/** Parse the menu CSV (name, category, price, unit, description). */
export function parseMenuCsv(text: string): { rows: ParsedMenuRow[]; error: string | null } {
  const { header, records } = csvObjects(text);
  if (!header.length) return { rows: [], error: "The file is empty." };
  if (!header.includes("name") || !header.includes("price")) {
    return { rows: [], error: `First row must be the header: ${MENU_CSV_HEADER}` };
  }
  if (records.length > 500) return { rows: [], error: "Import at most 500 products at a time." };

  const rows = records.map(({ line, get }) => {
    const raw = {
      name: get("name"),
      category: get("category"),
      price: get("price"),
      unit: get("unit"),
      description: get("description"),
    };
    const errors: string[] = [];
    const price = parsePrice(raw.price);
    const unit = parseUnit(raw.unit);
    if (!raw.name) errors.push("Name is missing");
    else if (raw.name.length > 100) errors.push("Name is too long");
    if (price == null) errors.push("Price must be a number");
    if (!unit) errors.push("Unit must be piece, kg, dozen or box");
    if (raw.category.length > 60) errors.push("Category is too long");
    const row: MenuRow | null = errors.length
      ? null
      : {
          name: raw.name,
          category: raw.category || "Menu",
          price: price!,
          unit: unit!,
          description: raw.description ? raw.description.slice(0, 500) : null,
        };
    return { line, row, raw, errors };
  });
  return { rows, error: null };
}

export type ShopImportRow = {
  name: string;
  slug: string;
  business_type: BusinessType;
  city: string | null;
  area: string | null;
  whatsapp_number: string;
  owner_name: string | null;
  owner_phone: string | null;
};

export type ParsedShopRow = { line: number; row: ShopImportRow | null; raw: Record<string, string>; errors: string[] };

export const SHOPS_CSV_HEADER = "name,slug,business_type,city,area,whatsapp_number,owner_name,owner_phone";

function parseBusinessType(raw: string): BusinessType | null {
  const v = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!v) return "other";
  if ((BUSINESS_TYPES as readonly string[]).includes(v)) return v as BusinessType;
  if (v === "kiryana" || v === "kirana") return "grocery";
  if (v === "sweets" || v === "bakers") return "bakery";
  return null;
}

/**
 * Parse the bulk shop CSV. Validates format and duplicates inside the file;
 * slug availability against the database is checked by the server action.
 */
export function parseShopsCsv(text: string): { rows: ParsedShopRow[]; error: string | null } {
  const { header, records } = csvObjects(text);
  if (!header.length) return { rows: [], error: "The file is empty." };
  if (!header.includes("name") || !header.includes("whatsapp_number")) {
    return { rows: [], error: `First row must be the header: ${SHOPS_CSV_HEADER}` };
  }
  if (records.length > 200) return { rows: [], error: "Import at most 200 shops at a time." };

  const seen = new Set<string>();
  const rows = records.map(({ line, get }) => {
    const raw = {
      name: get("name"),
      slug: get("slug"),
      business_type: get("business_type"),
      city: get("city"),
      area: get("area"),
      whatsapp_number: get("whatsapp_number"),
      owner_name: get("owner_name"),
      owner_phone: get("owner_phone"),
    };
    const errors: string[] = [];
    if (raw.name.length < 2) errors.push("Shop name is missing");
    if (raw.name.length > 80) errors.push("Shop name is too long");
    const slug = (raw.slug || slugify(raw.name)).toLowerCase();
    const slugErr = slugProblem(slug);
    if (slugErr) errors.push(`Link "${slug}": ${slugErr}`);
    else if (seen.has(slug)) errors.push(`Link "${slug}" appears twice in the file`);
    seen.add(slug);
    const bt = parseBusinessType(raw.business_type);
    if (!bt) errors.push(`Unknown business type "${raw.business_type}"`);
    const wa = toWhatsAppNumber(raw.whatsapp_number);
    if (!wa) errors.push("WhatsApp number is not a valid mobile number");
    const ownerPhone = raw.owner_phone ? toWhatsAppNumber(raw.owner_phone) : null;
    if (raw.owner_phone && !ownerPhone) errors.push("Owner phone is not a valid mobile number");

    const row: ShopImportRow | null = errors.length
      ? null
      : {
          name: raw.name,
          slug,
          business_type: bt!,
          city: raw.city || null,
          area: raw.area || null,
          whatsapp_number: wa!,
          owner_name: raw.owner_name || null,
          owner_phone: ownerPhone,
        };
    return { line, row, raw: { ...raw, slug }, errors };
  });
  return { rows, error: null };
}

// ---------------------------------------------------------------------------
// Inserting menus (server side, with the admin's session client)
// ---------------------------------------------------------------------------

type Db = SupabaseClient;

async function categoryMap(db: Db, shopId: string) {
  const { data, error } = await db
    .from("categories")
    .select("id, name, sort_order")
    .eq("shop_id", shopId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  let maxSort = 0;
  for (const c of data ?? []) {
    map.set(c.name.trim().toLowerCase(), c.id);
    maxSort = Math.max(maxSort, c.sort_order ?? 0);
  }
  return { map, maxSort };
}

/** Returns category ids for the given names, creating the missing ones. */
export async function ensureCategories(db: Db, shopId: string, names: string[]): Promise<Map<string, string>> {
  const { map, maxSort } = await categoryMap(db, shopId);
  const missing: string[] = [];
  for (const n of names) {
    const key = n.trim().toLowerCase();
    if (key && !map.has(key) && !missing.some((m) => m.toLowerCase() === key)) missing.push(n.trim());
  }
  if (missing.length) {
    const { data, error } = await db
      .from("categories")
      .insert(missing.map((name, i) => ({ shop_id: shopId, name, sort_order: maxSort + i + 1 })))
      .select("id, name");
    if (error) throw new Error(error.message);
    for (const c of data ?? []) map.set(c.name.trim().toLowerCase(), c.id);
  }
  return map;
}

async function existingProducts(db: Db, shopId: string) {
  const { data, error } = await db.from("products").select("name, sort_order").eq("shop_id", shopId);
  if (error) throw new Error(error.message);
  const names = new Set((data ?? []).map((p) => p.name.trim().toLowerCase()));
  const maxSort = (data ?? []).reduce((m, p) => Math.max(m, p.sort_order ?? 0), 0);
  return { names, maxSort };
}

/** Insert simple rows (CSV / quick-add). Skips names that already exist. */
export async function insertMenuRows(
  db: Db,
  shopId: string,
  rows: MenuRow[],
): Promise<{ added: number; skipped: number }> {
  const { names, maxSort } = await existingProducts(db, shopId);
  const fresh: MenuRow[] = [];
  for (const r of rows) {
    const key = r.name.trim().toLowerCase();
    if (names.has(key)) continue;
    names.add(key);
    fresh.push(r);
  }
  if (!fresh.length) return { added: 0, skipped: rows.length };
  const cats = await ensureCategories(
    db,
    shopId,
    fresh.map((r) => r.category),
  );
  const { error } = await db.from("products").insert(
    fresh.map((r, i) => ({
      shop_id: shopId,
      category_id: cats.get(r.category.trim().toLowerCase()) ?? null,
      name: r.name.trim(),
      description: r.description,
      base_price: r.price,
      unit: r.unit,
      qty_step: qtyStepFor(r.unit),
      sort_order: maxSort + i + 1,
    })),
  );
  if (error) throw new Error(error.message);
  return { added: fresh.length, skipped: rows.length - fresh.length };
}

/** Copy a menu template (categories, products, option groups + values) into a shop. */
export async function applyMenuTemplate(
  db: Db,
  shopId: string,
  template: Pick<MenuTemplate, "items">,
): Promise<{ added: number; skipped: number }> {
  const categories = template.items?.categories ?? [];
  const { names, maxSort } = await existingProducts(db, shopId);
  const cats = await ensureCategories(
    db,
    shopId,
    categories.filter((c) => c.products?.length).map((c) => c.name),
  );

  let added = 0;
  let skipped = 0;
  let sort = maxSort;
  for (const cat of categories) {
    for (const p of cat.products ?? []) {
      const key = p.name.trim().toLowerCase();
      if (names.has(key)) {
        skipped++;
        continue;
      }
      names.add(key);
      const unit: Unit = UNITS.includes(p.unit) ? p.unit : "piece";
      const { data: product, error } = await db
        .from("products")
        .insert({
          shop_id: shopId,
          category_id: cats.get(cat.name.trim().toLowerCase()) ?? null,
          name: p.name.trim(),
          description: p.description ?? null,
          base_price: Math.max(0, Math.round(p.base_price ?? 0)),
          unit,
          qty_step: p.qty_step > 0 ? p.qty_step : qtyStepFor(unit),
          sort_order: ++sort,
        })
        .select("id")
        .single();
      if (error || !product) throw new Error(error?.message ?? "Could not add product");
      added++;

      const groups = p.option_groups ?? [];
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        const { data: group, error: gErr } = await db
          .from("option_groups")
          .insert({
            product_id: product.id,
            name: g.name,
            type: g.type,
            is_required: !!g.is_required,
            min_select: Math.max(0, g.min_select ?? 0),
            max_select: g.max_select && g.max_select >= 1 ? g.max_select : null,
            sort_order: gi,
          })
          .select("id")
          .single();
        if (gErr || !group) throw new Error(gErr?.message ?? "Could not add option group");
        if (g.type !== "text" && g.values?.length) {
          const { error: vErr } = await db.from("option_values").insert(
            g.values.map((v, vi) => ({
              option_group_id: group.id,
              name: v.name,
              price_delta: Math.round(v.price_delta ?? 0),
              sort_order: vi,
            })),
          );
          if (vErr) throw new Error(vErr.message);
        }
      }
    }
  }
  return { added, skipped };
}

/** Product / category counts of a template, for the preview card. */
export function templateCounts(template: Pick<MenuTemplate, "items">) {
  const categories = template.items?.categories ?? [];
  return {
    categories: categories.length,
    products: categories.reduce((n, c) => n + (c.products?.length ?? 0), 0),
  };
}
