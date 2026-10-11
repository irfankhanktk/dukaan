"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ImageIcon, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { ShopAvatar } from "@/components/ui/product-image";
import { createClient } from "@/lib/supabase/client";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/types";
import { BUSINESS_TYPE_LABELS, slugify, slugProblem } from "@/lib/menu-import";
import { cn } from "@/lib/utils";
import { checkSlugAvailability, saveShopDetails } from "@/app/admin/shops/actions";
import { FormError, Section, StickyBar } from "./stepper";

export const BRAND_SWATCHES = [
  { value: "#0F5C4A", name: "Green" },
  { value: "#E39B2D", name: "Saffron" },
  { value: "#B42318", name: "Red" },
  { value: "#1E4C86", name: "Blue" },
  { value: "#5A3896", name: "Purple" },
  { value: "#22663A", name: "Leaf" },
];

export type DetailsDefaults = {
  name: string;
  slug: string;
  business_type: BusinessType;
  whatsapp_number: string;
  city: string;
  area: string;
  cover_color: string;
  logo_url: string | null;
};

type SlugState = { state: "idle" | "checking" | "ok" | "bad"; message: string };

async function toLogoBlob(file: File): Promise<{ blob: Blob; ext: string }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const side = 512;
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9));
    if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" };
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const jpg = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    if (jpg) return { blob: jpg, ext: "jpg" };
  } catch {
    /* fall through */
  }
  if (["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024) {
    return { blob: file, ext: file.type.split("/")[1]!.replace("jpeg", "jpg") };
  }
  throw new Error("Please use a JPG, PNG or WebP image (max 5 MB).");
}

export function StepDetails({
  shopId,
  requestId,
  defaults,
  isLive,
}: {
  shopId: string | null;
  requestId: string | null;
  defaults: DetailsDefaults;
  isLive?: boolean;
}) {
  const [v, setV] = useState(defaults);
  const [slugTouched, setSlugTouched] = useState(!!shopId || !!defaults.slug);
  const [slugState, setSlugState] = useState<SlugState>({ state: "idle", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof DetailsDefaults>(k: K, val: DetailsDefaults[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  // Live slug availability check (debounced).
  useEffect(() => {
    const slug = v.slug;
    if (!slug) {
      setSlugState({ state: "idle", message: "" });
      return;
    }
    const local = slugProblem(slug);
    if (local) {
      setSlugState({ state: "bad", message: local });
      return;
    }
    if (shopId && slug === defaults.slug) {
      setSlugState({ state: "ok", message: "Current link" });
      return;
    }
    setSlugState({ state: "checking", message: "Checking…" });
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await checkSlugAvailability(slug, shopId);
        if (!cancelled) setSlugState({ state: res.available ? "ok" : "bad", message: res.message });
      } catch {
        if (!cancelled) setSlugState({ state: "idle", message: "" });
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [v.slug, shopId, defaults.slug]);

  async function uploadLogo(file: File | undefined) {
    if (!file || !shopId) return;
    setErrors((e) => ({ ...e, logo_url: "" }));
    setUploading(true);
    try {
      const { blob, ext } = await toLogoBlob(file);
      const path = `${shopId}/logo-${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("product-photos")
        .upload(path, blob, { contentType: blob.type || `image/${ext}`, cacheControl: "31536000" });
      if (error) throw new Error("Upload failed. Please try again.");
      set("logo_url", supabase.storage.from("product-photos").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      setErrors((prev) => ({ ...prev, logo_url: e instanceof Error ? e.message : "Upload failed" }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const res = await saveShopDetails({ ...v, shopId, requestId, logo_url: v.logo_url });
      if (res && !res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
      }
    });
  }

  const preview = (
    <div className="overflow-hidden rounded-card border border-border bg-surface-card">
      <div className="h-20 md:h-24" style={{ backgroundColor: v.cover_color }} />
      <div className="-mt-8 flex items-end gap-3 px-4 pb-4">
        <ShopAvatar
          name={v.name || "Shop"}
          logoUrl={v.logo_url}
          className="h-16 w-16 border-4 border-surface-card text-lg"
        />
        <div className="min-w-0 pb-1">
          <p className="truncate text-lg font-bold">{v.name || "Shop name"}</p>
          <p className="truncate text-sm text-text-secondary">
            {[v.area, v.city].filter(Boolean).join(", ") || "Area, city"}
          </p>
        </div>
      </div>
      <p className="border-t border-border px-4 py-2 text-xs text-text-secondary">
        Shop link: <span className="font-medium text-text-primary">/{v.slug || "your-shop"}</span>
      </p>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="md:grid md:grid-cols-[minmax(0,1fr)_340px] md:items-start md:gap-6">
      <div className="mb-4 md:hidden">{preview}</div>

      <div className="space-y-4">
        <Section title="Shop details" description="What customers see at the top of the shop page.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Shop name" htmlFor="name" error={errors.name} className="md:col-span-2">
              <Input
                id="name"
                value={v.name}
                autoComplete="off"
                placeholder="Ali Bakers & Sweets"
                aria-invalid={!!errors.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setV((prev) => ({ ...prev, name, slug: slugTouched ? prev.slug : slugify(name) }));
                }}
              />
            </Field>

            <Field
              label="Shop link"
              htmlFor="slug"
              className="md:col-span-2"
              error={errors.slug || (slugState.state === "bad" ? slugState.message : undefined)}
              hint={
                isLive && v.slug !== defaults.slug
                  ? "Changing the link breaks QR codes already printed."
                  : "Lowercase letters, numbers and dashes."
              }
            >
              <div className="flex items-stretch overflow-hidden rounded-xl border border-border bg-surface-card focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/15">
                <span className="flex items-center bg-surface-bg px-3 text-sm text-text-secondary">dukaan/</span>
                <input
                  id="slug"
                  value={v.slug}
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none"
                  aria-invalid={slugState.state === "bad" || !!errors.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                  }}
                />
                <span className="flex w-10 items-center justify-center" aria-live="polite">
                  {slugState.state === "checking" && <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />}
                  {slugState.state === "ok" && <Check className="h-4 w-4 text-brand-whatsapp" aria-label="Available" />}
                  {slugState.state === "bad" && <X className="h-4 w-4 text-feedback-danger" aria-label="Not available" />}
                </span>
              </div>
              {slugState.state === "ok" && !errors.slug && (
                <p className="text-xs text-brand-whatsapp">{slugState.message}</p>
              )}
            </Field>

            <Field label="Business type" htmlFor="business_type" error={errors.business_type}>
              <Select
                id="business_type"
                value={v.business_type}
                onChange={(e) => set("business_type", e.target.value as BusinessType)}
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {BUSINESS_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="WhatsApp number (orders go here)"
              htmlFor="whatsapp_number"
              error={errors.whatsapp_number}
            >
              <Input
                id="whatsapp_number"
                type="tel"
                inputMode="tel"
                placeholder="0300 1234567"
                value={v.whatsapp_number}
                aria-invalid={!!errors.whatsapp_number}
                onChange={(e) => set("whatsapp_number", e.target.value)}
              />
            </Field>

            <Field label="City" htmlFor="city" error={errors.city}>
              <Input
                id="city"
                placeholder="Rawalpindi"
                value={v.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </Field>

            <Field label="Area / address" htmlFor="area" error={errors.area}>
              <Input
                id="area"
                placeholder="Satellite Town"
                value={v.area}
                onChange={(e) => set("area", e.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section title="Logo & colour" description="Optional. Without a logo the shop's initials are shown.">
          <div className="flex items-center gap-4">
            <ShopAvatar name={v.name || "Shop"} logoUrl={v.logo_url} className="h-16 w-16 text-lg" />
            {shopId ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <Loader2 className="animate-spin" /> : <ImageIcon />}
                  {uploading ? "Uploading…" : v.logo_url ? "Change logo" : "Upload logo"}
                </Button>
                {v.logo_url && !uploading && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => set("logo_url", null)}>
                    <Trash2 /> Use initials
                  </Button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void uploadLogo(e.target.files?.[0])}
                />
              </div>
            ) : (
              <p className="text-sm text-text-secondary">You can upload a logo after this step is saved.</p>
            )}
          </div>
          {errors.logo_url && <p className="mt-2 text-xs text-feedback-danger">{errors.logo_url}</p>}

          <p className="mt-5 text-[13px] font-medium text-text-secondary">Brand colour</p>
          <div className="mt-2 flex flex-wrap gap-3" role="radiogroup" aria-label="Brand colour">
            {BRAND_SWATCHES.map((c) => {
              const selected = v.cover_color.toUpperCase() === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => set("cover_color", c.value)}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 transition",
                    selected ? "ring-2 ring-text-primary" : "hover:scale-105",
                  )}
                  style={{ backgroundColor: c.value }}
                >
                  {selected && <Check className="h-5 w-5 text-text-inverse" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </Section>

        <FormError message={formError} />

        <StickyBar>
          <Button type="submit" size="lg" disabled={pending || uploading || slugState.state === "bad"}>
            {pending && <Loader2 className="animate-spin" />}
            {shopId ? "Save & continue" : "Create shop & continue"}
          </Button>
        </StickyBar>
      </div>

      <aside className="sticky top-6 hidden md:block">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Live preview</p>
        {preview}
      </aside>
    </form>
  );
}
