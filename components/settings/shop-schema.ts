import { z } from "zod";
import { toWhatsAppNumber } from "@/lib/format";
import { DAY_KEYS } from "@/lib/types";

/** Shop cover colours offered as swatches (first = brand default). */
export const COVER_COLORS = [
  { value: "#0F5C4A", name: "Green" },
  { value: "#E39B2D", name: "Saffron" },
  { value: "#B4442C", name: "Brick" },
  { value: "#1E4C86", name: "Blue" },
  { value: "#5A3896", name: "Purple" },
  { value: "#1F1D1A", name: "Charcoal" },
] as const;

export const rupees = (label: string) =>
  z.coerce
    .number({ error: `${label} must be a number` })
    .int(`${label} must be whole rupees`)
    .min(0, `${label} can't be negative`)
    .max(1_000_000, `${label} is too large`);

export const whatsappSchema = z
  .string()
  .trim()
  .min(1, "Enter the shop's WhatsApp number")
  .transform((v, ctx) => {
    const wa = toWhatsAppNumber(v);
    if (!wa) {
      ctx.addIssue({ code: "custom", message: "Enter a Pakistani mobile number like 0300 1234567" });
      return z.NEVER;
    }
    return wa;
  });

const time = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 09:00");

/** JSON-encoded hidden inputs (rows built in the client form) → parsed value. */
const json = <T extends z.ZodType>(schema: T, message: string) =>
  z.string().transform((raw, ctx) => {
    try {
      return JSON.parse(raw || "null") as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
  }).pipe(schema);

export const deliveryAreaSchema = z.object({
  name: z.string().trim().min(1, "Give every delivery area a name").max(60, "Area name is too long"),
  fee: rupees("Area delivery fee"),
});

export const deliveryAreasSchema = z
  .array(deliveryAreaSchema)
  .max(50, "Up to 50 delivery areas")
  .refine(
    (areas) => new Set(areas.map((a) => a.name.toLowerCase())).size === areas.length,
    "Each delivery area must have a different name",
  );

const dayHoursSchema = z
  .object({ open: time, close: time, closed: z.boolean() })
  .refine((d) => d.closed || d.open !== d.close, "Opening and closing time can't be the same");

export const daysSchema = z.object(
  Object.fromEntries(DAY_KEYS.map((d) => [d, dayHoursSchema])) as Record<
    (typeof DAY_KEYS)[number],
    typeof dayHoursSchema
  >,
);

/** Fields a shop owner can change from /dashboard/settings (never status, billing or slug). */
export const shopSettingsSchema = z
  .object({
    name: z.string().trim().min(2, "Shop name is too short").max(80, "Shop name is too long"),
    city: z.string().trim().max(60, "City is too long"),
    area: z.string().trim().max(80, "Area is too long"),
    whatsapp_number: whatsappSchema,
    delivery_mode: z.enum(["flat", "areas"]),
    delivery_fee: rupees("Delivery fee"),
    delivery_areas: json(deliveryAreasSchema, "Delivery areas are invalid"),
    min_order: rupees("Minimum order"),
    pickup_enabled: z.boolean(),
    days: json(daysSchema, "Opening hours are invalid — check each day's times"),
    prep_time: z.string().trim().max(40, "Keep prep time short, e.g. 30–45 min"),
    cover_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Pick a colour"),
    is_open: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.delivery_mode === "areas" && v.delivery_areas.length === 0) {
      ctx.addIssue({ code: "custom", path: ["delivery_areas"], message: "Add at least one delivery area" });
    }
  });

export type FieldErrors = Partial<Record<string, string>>;

/** First error message per field, from a failed zod parse. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: FieldErrors;
  /** Submitted text values, echoed back so the form keeps them after React resets it. */
  values?: Record<string, string>;
};

export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  });
  return out;
}
