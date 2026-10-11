"use server";

import { revalidatePath } from "next/cache";
import { requireShopOwnerContext } from "@/lib/auth";
import type { OpeningHours } from "@/lib/types";
import { fieldErrors, formValues, shopSettingsSchema, type FormState } from "@/components/settings/shop-schema";

export async function updateShopSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, shop } = await requireShopOwnerContext();

  const parsed = shopSettingsSchema.safeParse({
    name: formData.get("name") ?? "",
    city: formData.get("city") ?? "",
    area: formData.get("area") ?? "",
    whatsapp_number: formData.get("whatsapp_number") ?? "",
    delivery_mode: formData.get("delivery_mode") === "areas" ? "areas" : "flat",
    delivery_fee: formData.get("delivery_fee") || 0,
    delivery_areas: formData.get("delivery_areas") ?? "[]",
    min_order: formData.get("min_order") || 0,
    pickup_enabled: formData.get("pickup_enabled") === "on",
    days: formData.get("days") ?? "",
    prep_time: formData.get("prep_time") ?? "",
    cover_color: formData.get("cover_color") ?? "",
    is_open: formData.get("is_open") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error), values: formValues(formData) };
  }
  const v = parsed.data;

  const opening_hours: OpeningHours = { days: v.days };
  if (v.prep_time) opening_hours.prep_time = v.prep_time;

  // Only owner-editable columns. Status, plan, billing and slug are admin-only
  // (a database trigger rejects owner changes to them anyway).
  const { error } = await supabase
    .from("shops")
    .update({
      name: v.name,
      city: v.city || null,
      area: v.area || null,
      whatsapp_number: v.whatsapp_number,
      delivery_fee: v.delivery_fee,
      delivery_areas: v.delivery_mode === "areas" ? v.delivery_areas : [],
      min_order: v.min_order,
      pickup_enabled: v.pickup_enabled,
      opening_hours,
      cover_color: v.cover_color,
      is_open: v.is_open,
    })
    .eq("id", shop.id);

  if (error) {
    return { ok: false, message: "Couldn't save your settings. Please try again.", values: formValues(formData) };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath(`/${shop.slug}`);
  return { ok: true, message: "Settings saved" };
}
