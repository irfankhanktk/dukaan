"use server";

import { createHash } from "node:crypto";
import { after } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { toWhatsAppNumber } from "@/lib/format";
import { notifyNewShopRequest } from "@/lib/notify";
import { FORM_BUSINESS_TYPES, PREFERRED_TIMES, type RequestErrorCode } from "@/lib/home-i18n";

export type ShopRequestField =
  | "owner_name"
  | "shop_name"
  | "business_type"
  | "city"
  | "area"
  | "whatsapp_number"
  | "preferred_time";

export type ShopRequestState = {
  status: "idle" | "success" | "error";
  /** Error code for the whole form (translated on the client). */
  error?: RequestErrorCode;
  fieldErrors?: Partial<Record<ShopRequestField, RequestErrorCode>>;
  /** Echo of what was typed, so the form keeps its values after a failed submit. */
  values?: Partial<Record<ShopRequestField, string>>;
};

const MAX_PER_IP_PER_HOUR = 3;

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, { message: "required" })
    .max(max, { message: "too_long" });

const schema = z.object({
  owner_name: text(80),
  shop_name: text(100),
  business_type: z.enum(FORM_BUSINESS_TYPES, { message: "invalid_choice" }),
  city: text(60),
  area: text(100),
  whatsapp_number: z
    .string()
    .trim()
    .min(1, { message: "required" })
    .max(20, { message: "invalid_phone" })
    .transform((v, ctx) => {
      const wa = toWhatsAppNumber(v);
      if (!wa) {
        ctx.addIssue({ code: "custom", message: "invalid_phone" });
        return z.NEVER;
      }
      return wa;
    }),
  preferred_time: z.enum(PREFERRED_TIMES, { message: "invalid_choice" }),
});

const FIELDS: ShopRequestField[] = [
  "owner_name",
  "shop_name",
  "business_type",
  "city",
  "area",
  "whatsapp_number",
  "preferred_time",
];

function clientIp(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || null;
}

function baseUrl(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Public "Register your shop" form. Never a direct browser insert: validates, rate limits
 * by hashed IP, saves with the service key (shop_requests has no public RLS access) and
 * emails the platform owner after the response is sent.
 */
export async function submitShopRequest(
  _prev: ShopRequestState,
  formData: FormData,
): Promise<ShopRequestState> {
  const values: Partial<Record<ShopRequestField, string>> = {};
  for (const f of FIELDS) {
    const v = formData.get(f);
    if (typeof v === "string") values[f] = v.slice(0, 200);
  }

  // Honeypot: bots fill every field. Pretend it worked and do nothing.
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { status: "success" };
  }

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: ShopRequestState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ShopRequestField | undefined;
      if (field && !fieldErrors[field]) {
        const code = issue.message as RequestErrorCode;
        fieldErrors[field] =
          code === "required" || code === "too_long" || code === "invalid_phone" || code === "invalid_choice"
            ? code
            : field === "business_type" || field === "preferred_time"
              ? "invalid_choice"
              : "required";
      }
    }
    return { status: "error", error: "check_fields", fieldErrors, values };
  }
  const data = parsed.data;

  const h = await headers();
  const ip = clientIp(h);
  const ipHash = ip
    ? createHash("sha256")
        .update(`${process.env.REQUEST_IP_SALT ?? ""}${ip}`)
        .digest("hex")
    : null;

  try {
    const admin = createAdminClient();

    if (ipHash) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error } = await admin
        .from("shop_requests")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since);
      if (error) throw error;
      if ((count ?? 0) >= MAX_PER_IP_PER_HOUR) {
        return { status: "error", error: "rate_limited", values };
      }
    }

    // Same number in the last 24h: already have it — say thanks, don't duplicate.
    const daySince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dupes, error: dupeError } = await admin
      .from("shop_requests")
      .select("id", { count: "exact", head: true })
      .eq("whatsapp_number", data.whatsapp_number)
      .gte("created_at", daySince);
    if (dupeError) throw dupeError;
    if ((dupes ?? 0) > 0) return { status: "success" };

    const row = {
      owner_name: data.owner_name,
      shop_name: data.shop_name,
      business_type: data.business_type,
      city: data.city,
      area: data.area,
      whatsapp_number: data.whatsapp_number,
      preferred_time: data.preferred_time,
      source: "website_form" as const,
      status: "new" as const,
      ip_hash: ipHash,
    };
    const { error: insertError } = await admin.from("shop_requests").insert(row);
    if (insertError) throw insertError;

    const adminUrl = `${baseUrl(h)}/admin/requests`;
    // Runs after the response is sent; email problems never affect the shopkeeper.
    after(async () => {
      await notifyNewShopRequest({ ...row, adminUrl });
    });

    return { status: "success" };
  } catch (err) {
    console.error("submitShopRequest failed:", err);
    return { status: "error", error: "server", values };
  }
}
