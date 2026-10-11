"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, LayoutTemplate, ListPlus, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/ui/product-image";
import { Switch } from "@/components/menu/switch";
import { formatRs } from "@/lib/format";
import type { BusinessType, Unit } from "@/lib/types";
import {
  BUSINESS_TYPE_LABELS,
  MENU_CSV_HEADER,
  parseMenuCsv,
  parsePrice,
  UNITS,
  type MenuRow,
  type ParsedMenuRow,
} from "@/lib/menu-import";
import { cn } from "@/lib/utils";
import {
  addMenuRows,
  applyTemplate,
  deleteProductInline,
  finishMenuStep,
  updateProductInline,
} from "@/app/admin/shops/actions";
import { FormError, Section, StickyBar } from "./stepper";

export type TemplateSummary = {
  id: string;
  name: string;
  business_type: BusinessType;
  products: number;
  categories: number;
  categoryNames: string[];
};

export type WizardProduct = {
  id: string;
  name: string;
  base_price: number;
  category_id: string | null;
  is_available: boolean;
  photo_url: string | null;
  unit: Unit;
};

export type WizardCategory = { id: string; name: string };

type Tab = "template" | "csv" | "manual";

const CSV_EXAMPLE = `${MENU_CSV_HEADER}
Chocolate Fudge Cake,Cakes,1300,piece,Rich chocolate sponge
Chicken Patties,Savoury,120,piece,
Gulab Jamun,Sweets,1400,kg,Fresh daily`;

export function StepMenu({
  shopId,
  businessType,
  templates,
  products,
  categories,
  fullEditor,
}: {
  shopId: string;
  businessType: BusinessType;
  templates: TemplateSummary[];
  products: WizardProduct[];
  categories: WizardCategory[];
  fullEditor: React.ReactNode;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(products.length ? "manual" : "template");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinish] = useTransition();

  const report = (res: { ok: true; added: number; skipped: number } | { ok: false; error: string }) => {
    if (!res.ok) {
      setError(res.error);
      setNotice(null);
      return false;
    }
    setError(null);
    setNotice(
      `Added ${res.added} product${res.added === 1 ? "" : "s"}` +
        (res.skipped ? ` · skipped ${res.skipped} that already exist` : ""),
    );
    router.refresh();
    return true;
  };

  const missingPhotos = products.filter((p) => !p.photo_url).length;

  const tabs: { key: Tab; label: string; icon: typeof LayoutTemplate }[] = [
    { key: "template", label: "Template", icon: LayoutTemplate },
    { key: "csv", label: "Spreadsheet", icon: FileSpreadsheet },
    { key: "manual", label: "One by one", icon: ListPlus },
  ];

  return (
    <div className="space-y-4">
      <Section title="Add products" description="Pick any way — you can combine them. Existing product names are skipped.">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-bg p-1" role="tablist">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors",
                tab === key ? "bg-surface-card text-brand-primary shadow-sm" : "text-text-secondary",
              )}
            >
              <Icon className="hidden h-4 w-4 sm:block" /> {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "template" && (
            <TemplatePicker shopId={shopId} businessType={businessType} templates={templates} onDone={report} />
          )}
          {tab === "csv" && <CsvImport shopId={shopId} onDone={report} />}
          {tab === "manual" && (
            <QuickAdd shopId={shopId} categories={categories} onDone={report} fullEditor={fullEditor} />
          )}
        </div>

        {notice && (
          <p className="mt-4 rounded-xl bg-status-delivered-bg px-4 py-3 text-sm text-status-delivered-fg" role="status">
            {notice}
          </p>
        )}
        {error && <div className="mt-4"><FormError message={error} /></div>}
      </Section>

      <Section
        title="Current menu"
        description={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span>{products.length} products</span>
            <span>{categories.length} categories</span>
            <span className={missingPhotos ? "text-status-new-fg" : undefined}>{missingPhotos} missing photos</span>
          </span>
        }
      >
        {products.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-secondary">
            No products yet. Start from a template, import a spreadsheet or add them one by one.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {products.map((p) => (
              <ProductRow key={p.id} shopId={shopId} product={p} categories={categories} onError={setError} />
            ))}
          </ul>
        )}
      </Section>

      <StickyBar>
        <Button
          type="button"
          size="lg"
          disabled={finishing}
          onClick={() =>
            startFinish(async () => {
              const res = await finishMenuStep(shopId);
              if (res && !res.ok) setError(res.error);
            })
          }
        >
          {finishing && <Loader2 className="animate-spin" />}
          {products.length ? "Continue to review" : "Skip for now"}
        </Button>
      </StickyBar>
    </div>
  );
}

// ---------------------------------------------------------------------------

type Report = (res: { ok: true; added: number; skipped: number } | { ok: false; error: string }) => boolean;

function TemplatePicker({
  shopId,
  businessType,
  templates,
  onDone,
}: {
  shopId: string;
  businessType: BusinessType;
  templates: TemplateSummary[];
  onDone: Report;
}) {
  const [showAll, setShowAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const matching = templates.filter((t) => t.business_type === businessType);
  const list = showAll || matching.length === 0 ? templates : matching;

  if (!templates.length) {
    return <p className="text-sm text-text-secondary">No menu templates yet. Use a spreadsheet or add products one by one.</p>;
  }

  return (
    <div className="space-y-3">
      {matching.length === 0 && (
        <p className="text-sm text-text-secondary">
          No template for {BUSINESS_TYPE_LABELS[businessType]} yet — showing all templates.
        </p>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {list.map((t) => (
          <li key={t.id} className="flex flex-col rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{t.name}</p>
              <Badge variant={t.business_type === businessType ? "brand" : "unconfirmed"}>
                {BUSINESS_TYPE_LABELS[t.business_type]}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {t.products} products · {t.categories} categories
            </p>
            {t.categoryNames.length > 0 && (
              <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{t.categoryNames.join(", ")}</p>
            )}
            <Button
              type="button"
              size="sm"
              className="mt-3 self-start"
              disabled={busyId !== null}
              onClick={() => {
                setBusyId(t.id);
                startTransition(async () => {
                  const res = await applyTemplate(shopId, t.id);
                  onDone(res);
                  setBusyId(null);
                });
              }}
            >
              {busyId === t.id && <Loader2 className="animate-spin" />}
              Use this template
            </Button>
          </li>
        ))}
      </ul>
      {matching.length > 0 && templates.length > matching.length && (
        <Button type="button" variant="link" size="sm" className="px-0" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "Show only matching templates" : `Show all ${templates.length} templates`}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function CsvImport({ shopId, onDone }: { shopId: string; onDone: Report }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const parsed = useMemo(() => (text.trim() ? parseMenuCsv(text) : null), [text]);
  const valid = parsed?.rows.filter((r): r is ParsedMenuRow & { row: MenuRow } => !!r.row) ?? [];
  const invalid = parsed?.rows.filter((r) => !r.row) ?? [];

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        Columns: <code className="rounded bg-surface-bg px-1.5 py-0.5 text-xs">{MENU_CSV_HEADER}</code>. Unit is
        piece, kg, dozen or box (default piece). Paste from a spreadsheet or upload a .csv file.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <label className="cursor-pointer">
            <Upload /> Upload CSV
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setText(await f.text());
                e.target.value = "";
              }}
            />
          </label>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setText(CSV_EXAMPLE)}>
          Fill example
        </Button>
      </div>
      <Textarea
        value={text}
        rows={6}
        spellCheck={false}
        aria-label="CSV"
        placeholder={CSV_EXAMPLE}
        className="font-mono text-sm"
        onChange={(e) => setText(e.target.value)}
      />

      {parsed?.error && <FormError message={parsed.error} />}
      {parsed && !parsed.error && parsed.rows.length > 0 && (
        <>
          <p className="text-sm">
            <strong>{valid.length}</strong> ready
            {invalid.length > 0 && (
              <span className="text-feedback-danger"> · {invalid.length} with errors (will be skipped)</span>
            )}
          </p>
          <div className="max-h-80 overflow-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-bg text-xs text-text-secondary">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsed.rows.map((r) => (
                  <tr key={r.line} className={r.row ? undefined : "bg-status-rejected-bg/60"}>
                    <td className="px-3 py-2 text-text-secondary">{r.line}</td>
                    <td className="px-3 py-2">
                      {r.raw.name || "—"}
                      {r.errors.length > 0 && (
                        <span className="block text-xs text-feedback-danger">{r.errors.join(" · ")}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{r.row?.category ?? r.raw.category}</td>
                    <td className="px-3 py-2 text-right">{r.row ? formatRs(r.row.price) : r.raw.price}</td>
                    <td className="px-3 py-2">{r.row?.unit ?? r.raw.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            disabled={pending || valid.length === 0}
            onClick={() =>
              startTransition(async () => {
                const res = await addMenuRows(
                  shopId,
                  valid.map((r) => r.row),
                );
                if (onDone(res)) setText("");
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            Import {valid.length} product{valid.length === 1 ? "" : "s"}
          </Button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type QuickRow = { key: string; name: string; category: string; price: string; unit: Unit };
let quickSeq = 0;
const newQuickRow = (category = ""): QuickRow => ({ key: `q${++quickSeq}`, name: "", category, price: "", unit: "piece" });

function QuickAdd({
  shopId,
  categories,
  onDone,
  fullEditor,
}: {
  shopId: string;
  categories: WizardCategory[];
  onDone: Report;
  fullEditor: React.ReactNode;
}) {
  const [rows, setRows] = useState<QuickRow[]>(() => [newQuickRow(), newQuickRow(), newQuickRow()]);
  const [rowError, setRowError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const setRow = (key: string, patch: Partial<QuickRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function saveAll() {
    const filled = rows.filter((r) => r.name.trim() || r.price.trim());
    if (!filled.length) {
      setRowError("Type at least one product name and price.");
      return;
    }
    const bad = filled.find((r) => !r.name.trim() || parsePrice(r.price) == null);
    if (bad) {
      setRowError("Every row needs a name and a price.");
      return;
    }
    setRowError(null);
    startTransition(async () => {
      const res = await addMenuRows(
        shopId,
        filled.map((r) => ({
          name: r.name.trim(),
          category: r.category.trim(),
          price: parsePrice(r.price)!,
          unit: r.unit,
          description: null,
        })),
      );
      if (onDone(res)) {
        const lastCat = filled[filled.length - 1]?.category ?? "";
        setRows([newQuickRow(lastCat), newQuickRow(lastCat), newQuickRow(lastCat)]);
      }
    });
  }

  return (
    <div className="space-y-3">
      <datalist id="wizard-categories">
        {categories.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_110px_110px_44px] gap-2 px-1 text-xs font-medium text-text-secondary md:grid">
        <span>Name</span>
        <span>Category</span>
        <span>Price (Rs)</span>
        <span>Unit</span>
        <span />
      </div>
      <ul className="space-y-3 md:space-y-2">
        {rows.map((r, i) => (
          <li
            key={r.key}
            className="grid grid-cols-[minmax(0,1fr)_110px] gap-2 rounded-xl border border-border p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_110px_110px_44px] md:border-0 md:p-0"
          >
            <Input
              aria-label={`Row ${i + 1} name`}
              placeholder="Product name"
              value={r.name}
              className="col-span-2 md:col-span-1"
              onChange={(e) => setRow(r.key, { name: e.target.value })}
            />
            <Input
              aria-label={`Row ${i + 1} category`}
              placeholder="Category"
              list="wizard-categories"
              value={r.category}
              className="col-span-2 md:col-span-1"
              onChange={(e) => setRow(r.key, { category: e.target.value })}
            />
            <Input
              aria-label={`Row ${i + 1} price`}
              placeholder="Price"
              inputMode="numeric"
              value={r.price}
              onChange={(e) => setRow(r.key, { price: e.target.value.replace(/[^\d]/g, "") })}
            />
            <Select
              aria-label={`Row ${i + 1} unit`}
              value={r.unit}
              onChange={(e) => setRow(r.key, { unit: e.target.value as Unit })}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove row"
              className="col-span-2 h-10 w-full text-feedback-danger md:col-span-1 md:h-12 md:w-11"
              disabled={rows.length === 1}
              onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      {rowError && <p className="text-xs text-feedback-danger">{rowError}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setRows((prev) => [...prev, newQuickRow(prev[prev.length - 1]?.category ?? "")])}
        >
          <Plus /> Add row
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={saveAll}>
          {pending && <Loader2 className="animate-spin" />}
          Save all
        </Button>
        <div className="ms-auto">{fullEditor}</div>
      </div>
      <p className="text-xs text-text-secondary">
        Kg products get 0.5 kg steps. For photos, option groups (size, flavour, extras) and descriptions use the
        full product editor.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ProductRow({
  shopId,
  product,
  categories,
  onError,
}: {
  shopId: string;
  product: WizardProduct;
  categories: WizardCategory[];
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.base_price));
  const [available, setAvailable] = useState(product.is_available);
  const [pending, startTransition] = useTransition();

  const save = (patch: Parameters<typeof updateProductInline>[2]) =>
    startTransition(async () => {
      const res = await updateProductInline(shopId, product.id, patch);
      if (!res.ok) onError(res.error);
      else {
        onError(null);
        router.refresh();
      }
    });

  return (
    <li className={cn("flex flex-wrap items-center gap-2 py-3 md:flex-nowrap", pending && "opacity-60")}>
      <ProductImage src={product.photo_url} alt={product.name} className="h-11 w-11 shrink-0 [&_svg]:h-5 [&_svg]:w-5" />
      <Input
        aria-label="Name"
        value={name}
        className="h-11 min-w-0 flex-1 basis-40"
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const n = name.trim();
          if (!n) setName(product.name);
          else if (n !== product.name) save({ name: n });
        }}
      />
      <div className="relative w-28 shrink-0">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">Rs</span>
        <Input
          aria-label="Price"
          inputMode="numeric"
          value={price}
          className="h-11 pl-9"
          onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={() => {
            const n = parsePrice(price);
            if (n == null) setPrice(String(product.base_price));
            else if (n !== product.base_price) save({ base_price: n });
          }}
        />
      </div>
      <Select
        aria-label="Category"
        value={product.category_id ?? ""}
        className="h-11 min-w-0 flex-1 basis-32 md:w-40 md:flex-none"
        onChange={(e) => save({ category_id: e.target.value || null })}
      >
        <option value="">No category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Switch
        checked={available}
        label="Available"
        onCheckedChange={(v) => {
          setAvailable(v);
          save({ is_available: v });
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Delete ${product.name}`}
        className="text-feedback-danger"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Delete "${product.name}"?`)) return;
          startTransition(async () => {
            const res = await deleteProductInline(shopId, product.id);
            if (!res.ok) onError(res.error);
            else router.refresh();
          });
        }}
      >
        <Trash2 />
      </Button>
    </li>
  );
}
