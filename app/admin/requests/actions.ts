"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { toWhatsAppNumber } from "@/lib/format";
import { BUSINESS_TYPES, REQUEST_STATUSES } from "@/lib/types";
import { PREFERRED_TIMES } from "@/lib/home-i18n";
import { MANUAL_SOURCES, pkDateToIso } from "@/components/admin/requests/labels";

export type ActionResult = { ok: true } | { ok: false; error: string };

const idSchema = z.string().uuid();
const dateSchema = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);

function revalidate() {
  revalidatePath("/admin/requests");
  // Admin layout holds the "new requests" badge count.
  revalidatePath("/admin", "layout");
}

/** Updates one request through the admin's own session (RLS: super admin only). */
async function updateRequest(id: string, patch: Record<string, unknown>): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const { data, error } = await admin.supabase
    .from("shop_requests")
    .update(patch)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Request not found" };
  revalidate();
  return { ok: true };
}

export async function updateRequestStatus(id: string, status: string): Promise<ActionResult> {
  const parsed = z.object({ id: idSchema, status: z.enum(REQUEST_STATUSES) }).safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Invalid status" };
  return updateRequest(parsed.data.id, { status: parsed.data.status });
}

export async function updateRequestFollowUp(id: string, date: string): Promise<ActionResult> {
  const parsed = z.object({ id: idSchema, date: dateSchema }).safeParse({ id, date });
  if (!parsed.success) return { ok: false, error: "Invalid date" };
  return updateRequest(parsed.data.id, {
    follow_up_at: parsed.data.date ? pkDateToIso(parsed.data.date) : null,
  });
}

export async function updateRequestNotes(id: string, notes: string): Promise<ActionResult> {
  const parsed = z
    .object({ id: idSchema, notes: z.string().max(4000, "Notes are too long") })
    .safeParse({ id, notes });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid notes" };
  const trimmed = parsed.data.notes.trim();
  return updateRequest(parsed.data.id, { notes: trimmed === "" ? null : trimmed });
}

// ---------------------------------------------------------------------------
// "Add request manually" — leads that came via WhatsApp, in person or referral.
// ---------------------------------------------------------------------------

export type ManualRequestState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Max ${max} characters`)
    .transform((v) => (v === "" ? null : v));

const manualSchema = z.object({
  owner_name: z.string().trim().min(1, "Required").max(80, "Max 80 characters"),
  shop_name: z.string().trim().min(1, "Required").max(100, "Max 100 characters"),
  business_type: z.enum(BUSINESS_TYPES, { message: "Choose a business type" }),
  city: optionalText(60),
  area: optionalText(100),
  whatsapp_number: z
    .string()
    .trim()
    .min(1, "Required")
    .transform((v, ctx) => {
      const wa = toWhatsAppNumber(v);
      if (!wa) {
        ctx.addIssue({ code: "custom", message: "Enter a valid PK mobile number, e.g. 0300 1234567" });
        return z.NEVER;
      }
      return wa;
    }),
  preferred_time: z.union([z.literal(""), z.enum(PREFERRED_TIMES)]).transform((v) => (v === "" ? null : v)),
  source: z.enum(MANUAL_SOURCES, { message: "Choose a source" }),
  status: z.enum(REQUEST_STATUSES),
  notes: optionalText(4000),
  follow_up_at: dateSchema.transform((v) => (v ? pkDateToIso(v) : null)),
});

export async function createManualRequest(
  _prev: ManualRequestState,
  formData: FormData,
): Promise<ManualRequestState> {
  const admin = await requireSuperAdmin();
  const raw = Object.fromEntries(
    [
      "owner_name",
      "shop_name",
      "business_type",
      "city",
      "area",
      "whatsapp_number",
      "preferred_time",
      "source",
      "status",
      "notes",
      "follow_up_at",
    ].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = manualSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  const { error } = await admin.supabase.from("shop_requests").insert(parsed.data);
  if (error) return { status: "error", message: error.message };

  revalidate();
  return { status: "success", message: `Added ${parsed.data.shop_name}.` };
}
