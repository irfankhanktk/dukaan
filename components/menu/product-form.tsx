"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { formatRs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BusinessType, Category, ProductWithOptions, Unit } from "@/lib/types";
import { saveProduct, type SaveProductInput } from "@/app/dashboard/menu/actions";
import { DeleteProductButton } from "./delete-product-button";
import {
  OptionGroupsEditor,
  groupsFromProduct,
  newKey,
  parsePrice,
  type EditorGroup,
} from "./option-groups-editor";
import { PhotoUpload } from "./photo-upload";
import { UNIT_LABELS, fromPrice, unitSuffix } from "./price";
import { Switch } from "./switch";

const NEW_CATEGORY = "__new__";
const UNITS: Unit[] = ["piece", "kg", "dozen", "box"];
const KG_STEPS = [0.25, 0.5, 1];

type DetailRow = { key: string; name: string; value: string };

const card = "md:rounded-card md:border md:border-border md:bg-surface-card md:p-6";

export function ProductForm({
  shop,
  categories,
  product,
}: {
  shop: { id: string; business_type: BusinessType };
  categories: Category[];
  product?: ProductWithOptions;
}) {
  const router = useRouter();
  const isEdit = !!product;
  const title = isEdit ? "Edit product" : "Add product";

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    product ? (product.category_id ?? "") : (categories[0]?.id ?? ""),
  );
  const [newCategory, setNewCategory] = useState("");
  const [price, setPrice] = useState(product ? String(product.base_price) : "");
  const [unit, setUnit] = useState<Unit>(product?.unit ?? "piece");
  const [qtyStep, setQtyStep] = useState<number>(product?.unit === "kg" ? Number(product.qty_step) : 0.5);
  const [photoUrl, setPhotoUrl] = useState<string | null>(product?.photo_url ?? null);
  const [available, setAvailable] = useState(product?.is_available ?? true);
  const [details, setDetails] = useState<DetailRow[]>(() =>
    Object.entries(product?.details ?? {}).map(([k, v]) => ({ key: newKey(), name: k, value: String(v) })),
  );
  const [groups, setGroups] = useState<EditorGroup[]>(() => groupsFromProduct(product?.option_groups ?? []));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const basePrice = parsePrice(price);
  const preview = useMemo(
    () =>
      fromPrice(
        basePrice,
        groups.map((g) => ({
          type: g.type,
          is_required: g.is_required,
          min_select: g.min_select,
          option_values: g.values.map((v) => ({ price_delta: parsePrice(v.price) })),
        })),
      ),
    [basePrice, groups],
  );

  function buildInput(): SaveProductInput | string {
    if (!name.trim()) return "Product name is required";
    if (price.trim() === "" || !/^\d+$/.test(price.trim())) return "Enter the price in whole rupees";
    if (categoryId === NEW_CATEGORY && !newCategory.trim()) return "Enter a name for the new category";
    const detailRecord: Record<string, string> = {};
    for (const d of details) {
      const k = d.name.trim();
      const v = d.value.trim();
      if (k && v) detailRecord[k] = v;
      else if (k || v) return "Each detail needs both a name and a value";
    }
    return {
      id: product?.id,
      name: name.trim(),
      description: description.trim() || null,
      category_id: categoryId && categoryId !== NEW_CATEGORY ? categoryId : null,
      new_category_name: categoryId === NEW_CATEGORY ? newCategory.trim() : null,
      base_price: Number(price.trim()),
      unit,
      qty_step: unit === "kg" ? qtyStep : 1,
      photo_url: photoUrl,
      is_available: available,
      details: detailRecord,
      option_groups: groups.map((g) => ({
        id: g.id,
        name: g.name.trim(),
        type: g.type,
        is_required: g.is_required,
        min_select: g.min_select,
        max_select: g.type === "single" ? 1 : g.type === "multiple" ? g.max_select : null,
        values:
          g.type === "text"
            ? []
            : g.values.map((v) => ({ id: v.id, name: v.name.trim(), price_delta: parsePrice(v.price) })),
      })),
    };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || uploading) return;
    const input = buildInput();
    if (typeof input === "string") {
      setError(input);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await saveProduct(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/dashboard/menu");
    });
  }

  const saveLabel = pending ? "Saving…" : uploading ? "Uploading photo…" : "Save product";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 md:gap-6">
      {/* Header */}
      <div className="flex items-center gap-3 md:items-start">
        <Link
          href="/dashboard/menu"
          aria-label="Back to menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-card md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-text-primary md:text-[28px] md:leading-tight">{title}</h1>
          <p className="hidden text-sm text-text-secondary md:block">
            <Link href="/dashboard/menu" className="hover:underline">
              Menu
            </Link>{" "}
            / {isEdit ? product.name : "Add product"}
          </p>
        </div>
        <button
          type="submit"
          disabled={pending || uploading}
          className="text-base font-semibold text-brand-primary disabled:opacity-50 md:hidden"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <div className="hidden gap-3 md:flex">
          <Button asChild variant="secondary">
            <Link href="/dashboard/menu">Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending || uploading}>
            {saveLabel}
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-feedback-danger/30 bg-feedback-danger/5 px-4 py-3 text-sm text-feedback-danger">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Product details */}
        <section className={cn("flex flex-col gap-4", card)}>
          <h2 className="hidden text-lg font-bold md:block">Product details</h2>

          <PhotoUpload shopId={shop.id} value={photoUrl} onChange={setPhotoUrl} onUploadingChange={setUploading} />

          <Field label="Product name" htmlFor="p-name">
            <Input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chocolate Fudge Cake"
              maxLength={80}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" htmlFor="p-category">
              <Select id="p-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW_CATEGORY}>+ New category…</option>
              </Select>
            </Field>
            <Field label="Starting price" htmlFor="p-price">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-text-secondary">
                  Rs
                </span>
                <Input
                  id="p-price"
                  value={price}
                  inputMode="numeric"
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                  placeholder="0"
                  className="pl-11"
                  required
                />
              </div>
            </Field>
          </div>

          {categoryId === NEW_CATEGORY && (
            <Field label="New category name" htmlFor="p-new-category">
              <Input
                id="p-new-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Cakes"
                maxLength={40}
                autoFocus
              />
            </Field>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-text-secondary">Sold by</span>
            <div className="flex flex-wrap items-center gap-3">
              <div role="radiogroup" aria-label="Sold by" className="inline-flex rounded-xl border border-border bg-surface-card p-1">
                {UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    role="radio"
                    aria-checked={unit === u}
                    onClick={() => setUnit(u)}
                    className={cn(
                      "h-9 rounded-lg px-4 text-sm font-semibold transition-colors",
                      unit === u ? "bg-brand-primary text-text-inverse" : "text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {UNIT_LABELS[u]}
                  </button>
                ))}
              </div>
              {unit === "kg" && (
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  Step
                  <Select
                    value={qtyStep}
                    onChange={(e) => setQtyStep(Number(e.target.value))}
                    className="h-10 w-auto px-3 pr-8 text-sm"
                    aria-label="Quantity step"
                  >
                    {KG_STEPS.map((s) => (
                      <option key={s} value={s}>
                        {s} kg
                      </option>
                    ))}
                  </Select>
                </label>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              {unit === "kg"
                ? `Price is per kg. Customers order in steps of ${qtyStep} kg.`
                : unit === "piece"
                  ? "Price is per piece."
                  : `Price is per ${unit}.`}
            </p>
          </div>

          <Field label="Description (optional)" htmlFor="p-description">
            <Textarea
              id="p-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Rich chocolate sponge with fudge frosting"
              maxLength={500}
              className="min-h-[72px]"
            />
          </Field>

          <div className="flex items-center gap-3 rounded-card border border-border bg-surface-card p-4 md:border-0 md:bg-surface-bg">
            <div className="flex-1">
              <p className="font-semibold text-text-primary">Show to customers</p>
              <p className="text-xs text-text-secondary">
                {available ? "Customers can order this item" : "Hidden from customers (saved as a draft)"}
              </p>
            </div>
            <Switch checked={available} onCheckedChange={setAvailable} label="Show to customers" />
          </div>

          {/* Info-only details */}
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-[13px] font-medium text-text-secondary">Details (optional)</p>
              <p className="text-xs text-text-secondary">Info shown to customers, e.g. Serves: 4 or Weight: 1 kg</p>
            </div>
            {details.map((d) => (
              <div key={d.key} className="grid grid-cols-[2fr_3fr_2rem] items-center gap-2">
                <Input
                  value={d.name}
                  onChange={(e) =>
                    setDetails(details.map((x) => (x.key === d.key ? { ...x, name: e.target.value } : x)))
                  }
                  placeholder="Serves"
                  aria-label="Detail name"
                  maxLength={40}
                  className="h-10 rounded-lg px-3 text-sm"
                />
                <Input
                  value={d.value}
                  onChange={(e) =>
                    setDetails(details.map((x) => (x.key === d.key ? { ...x, value: e.target.value } : x)))
                  }
                  placeholder="4 people"
                  aria-label="Detail value"
                  maxLength={120}
                  className="h-10 rounded-lg px-3 text-sm"
                />
                <button
                  type="button"
                  aria-label="Remove detail"
                  onClick={() => setDetails(details.filter((x) => x.key !== d.key))}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-surface-bg hover:text-feedback-danger"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {details.length < 12 && (
              <button
                type="button"
                onClick={() => setDetails([...details, { key: newKey(), name: "", value: "" }])}
                className="inline-flex items-center gap-1.5 self-start py-1 text-sm font-semibold text-brand-primary hover:underline"
              >
                <Plus className="h-4 w-4" /> Add detail
              </button>
            )}
          </div>

          {isEdit && (
            <div className="hidden border-t border-border pt-4 lg:block">
              <DeleteProductButton productId={product.id} productName={product.name} />
            </div>
          )}
        </section>

        {/* Option groups */}
        <section className={cn("flex flex-col gap-4", card, "lg:min-h-full")}>
          <div>
            <h2 className="text-lg font-bold">Option groups</h2>
            <p className="text-sm text-text-secondary">
              Add choices customers pick from, like size, weight or extras. Quick start:
            </p>
          </div>

          <OptionGroupsEditor
            groups={groups}
            onChange={setGroups}
            businessType={shop.business_type}
            basePrice={basePrice}
          />

          <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-accent-soft px-4 py-3">
            <span className="text-sm text-text-secondary">Customers see</span>
            <span className="text-right text-[15px] font-bold text-text-primary">
              {preview.varies ? "from " : ""}
              {formatRs(preview.price)}
              {unitSuffix(unit)}
            </span>
          </div>
        </section>

        {isEdit && (
          <div className="lg:hidden">
            <DeleteProductButton productId={product.id} productName={product.name} />
          </div>
        )}
      </div>

      {/* Sticky save bar (mobile). Sits above the dashboard bottom nav. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-border bg-surface-bg/95 px-4 py-3 backdrop-blur md:hidden">
        <Button type="submit" size="lg" disabled={pending || uploading} className="w-full">
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}
