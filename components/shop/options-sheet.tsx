"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { OptionRow } from "@/components/ui/option-row";
import { ProductImage } from "@/components/ui/product-image";
import { cn } from "@/lib/utils";
import { formatRs } from "@/lib/format";
import type { CartLine, OptionGroup, OrderItemOption, ProductWithOptions } from "@/lib/types";
import { useLang } from "./language";
import { defaultQty, lineKey, roundQty, unitKey } from "./pricing";
import { QtyStepper } from "./qty-stepper";
import { Sheet } from "./sheet";

function minNeeded(g: OptionGroup): number {
  return Math.max(g.min_select ?? 0, g.is_required ? 1 : 0);
}

function initialSelection(p: ProductWithOptions): Record<string, string[]> {
  const sel: Record<string, string[]> = {};
  for (const g of p.option_groups) {
    if (g.type === "single" && minNeeded(g) > 0 && g.option_values[0]) {
      sel[g.id] = [g.option_values[0].id];
    } else {
      sel[g.id] = [];
    }
  }
  return sel;
}

/** "Choose options" bottom sheet (mobile) / modal (desktop). Mount with a `key` per product. */
export function OptionsSheet({
  product,
  open,
  onClose,
  onAdd,
}: {
  product: ProductWithOptions;
  open: boolean;
  onClose: () => void;
  onAdd: (line: CartLine) => void;
}) {
  const { t } = useLang();
  const titleId = useId();
  const [selected, setSelected] = useState<Record<string, string[]>>(() =>
    initialSelection(product),
  );
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(() => defaultQty(product.qty_step));
  const [showErrors, setShowErrors] = useState(false);

  const groups = product.option_groups.filter(
    (g) => g.type === "text" || g.option_values.length > 0,
  );

  const unitPrice = useMemo(() => {
    let price = product.base_price;
    for (const g of groups) {
      if (g.type === "text") continue;
      for (const v of g.option_values) if (selected[g.id]?.includes(v.id)) price += v.price_delta;
    }
    return Math.max(0, price);
  }, [groups, selected, product.base_price]);

  const missing = groups.filter((g) => {
    if (g.type === "text") return g.is_required && !(texts[g.id] ?? "").trim();
    return (selected[g.id]?.length ?? 0) < minNeeded(g);
  });

  const toggle = (g: OptionGroup, valueId: string) => {
    setSelected((prev) => {
      const cur = prev[g.id] ?? [];
      if (g.type === "single") {
        // Optional single groups can be cleared by tapping the chosen value again.
        if (cur.includes(valueId) && minNeeded(g) === 0) return { ...prev, [g.id]: [] };
        return { ...prev, [g.id]: [valueId] };
      }
      if (cur.includes(valueId)) return { ...prev, [g.id]: cur.filter((id) => id !== valueId) };
      if (g.max_select != null && cur.length >= g.max_select) {
        if (g.max_select === 1) return { ...prev, [g.id]: [valueId] };
        return prev;
      }
      return { ...prev, [g.id]: [...cur, valueId] };
    });
  };

  const submit = () => {
    if (missing.length > 0) {
      setShowErrors(true);
      document.getElementById(`group-${missing[0]!.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    const valueIds: string[] = [];
    const options: OrderItemOption[] = [];
    const textList: { group_id: string; text: string }[] = [];
    for (const g of groups) {
      if (g.type === "text") {
        const text = (texts[g.id] ?? "").trim().slice(0, 200);
        if (text) {
          textList.push({ group_id: g.id, text });
          options.push({ group: g.name, choice: text, price: 0 });
        }
        continue;
      }
      for (const v of g.option_values) {
        if (selected[g.id]?.includes(v.id)) {
          valueIds.push(v.id);
          options.push({ group: g.name, choice: v.name, price: v.price_delta });
        }
      }
    }
    const trimmedNote = note.trim().slice(0, 300) || undefined;
    onAdd({
      key: lineKey(product.id, valueIds, textList, trimmedNote),
      product_id: product.id,
      name: product.name,
      quantity: roundQty(qty),
      unit: product.unit,
      qty_step: product.qty_step,
      unit_price: unitPrice,
      option_value_ids: valueIds,
      texts: textList,
      options,
      note: trimmedNote,
      photo_url: product.photo_url,
    });
  };

  const uKey = unitKey(product.unit);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      footer={
        <div className="flex items-center gap-3">
          <QtyStepper
            value={qty}
            step={product.qty_step}
            unit={product.unit}
            onChange={setQty}
          />
          <Button size="lg" className="flex-1 px-4" onClick={submit}>
            <span className="truncate">{t("addToCart")}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{formatRs(Math.round(unitPrice * qty))}</span>
          </Button>
        </div>
      }
    >
      {product.photo_url ? (
        <ProductImage
          src={product.photo_url}
          alt={product.name}
          className="h-52 w-full rounded-none md:h-60"
          sizes="(min-width: 768px) 560px, 100vw"
        />
      ) : null}
      <div className="px-4 pb-4 pt-4 md:px-6">
        <h2 id={titleId} className="pe-10 text-xl font-bold leading-snug" dir="auto">
          {product.name}
        </h2>
        {product.description && (
          <p className="mt-1 text-sm text-text-secondary" dir="auto">
            {product.description}
          </p>
        )}
        <p className="mt-2 text-lg font-bold text-brand-primary">
          {formatRs(product.base_price)}
          {uKey && (
            <span className="text-sm font-medium text-text-secondary">
              {" "}
              {t("perUnit", { unit: t(uKey) })}
            </span>
          )}
        </p>

        {Object.keys(product.details ?? {}).length > 0 && (
          <dl className="mt-3 flex flex-wrap gap-2 text-xs">
            {Object.entries(product.details).map(([k, v]) => (
              <div key={k} className="rounded-full bg-surface-bg px-3 py-1">
                <dt className="inline text-text-secondary">{k}: </dt>
                <dd className="inline font-medium">{String(v)}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-5 flex flex-col gap-6">
          {groups.map((g) => {
            const need = minNeeded(g);
            const isMissing = showErrors && missing.includes(g);
            const hint =
              g.type === "single"
                ? t("chooseOne")
                : g.type === "multiple"
                  ? g.max_select != null
                    ? t("chooseUpTo", { n: g.max_select })
                    : need > 1
                      ? t("chooseAtLeast", { n: need })
                      : null
                  : null;
            const count = selected[g.id]?.length ?? 0;
            return (
              <fieldset key={g.id} id={`group-${g.id}`} className="min-w-0">
                <legend className="flex w-full items-center justify-between gap-2">
                  <span className="text-base font-bold" dir="auto">
                    {g.name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      need > 0 || (g.type === "text" && g.is_required)
                        ? isMissing
                          ? "bg-feedback-danger text-text-inverse"
                          : "bg-brand-accent-soft text-status-new-fg"
                        : "bg-surface-bg text-text-secondary",
                    )}
                  >
                    {need > 0 || (g.type === "text" && g.is_required) ? t("required") : t("optional")}
                  </span>
                </legend>
                {hint && <p className="mt-0.5 text-xs text-text-secondary">{hint}</p>}

                {g.type === "text" ? (
                  <Input
                    className="mt-2"
                    aria-label={g.name}
                    aria-invalid={isMissing || undefined}
                    placeholder={t("typeHere")}
                    maxLength={200}
                    value={texts[g.id] ?? ""}
                    onChange={(e) => setTexts((p) => ({ ...p, [g.id]: e.target.value }))}
                  />
                ) : (
                  <div
                    className="mt-2 flex flex-col gap-2"
                    role={g.type === "single" ? "radiogroup" : "group"}
                    aria-label={g.name}
                  >
                    {g.option_values.map((v) => {
                      const isSel = selected[g.id]?.includes(v.id) ?? false;
                      const atMax =
                        g.type === "multiple" &&
                        g.max_select != null &&
                        g.max_select > 1 &&
                        count >= g.max_select;
                      return (
                        <OptionRow
                          key={v.id}
                          type={g.type === "single" ? "single" : "multiple"}
                          label={v.name}
                          priceDelta={v.price_delta}
                          selected={isSel}
                          disabled={!isSel && atMax}
                          onSelect={() => toggle(g, v.id)}
                        />
                      );
                    })}
                  </div>
                )}
                {isMissing && (
                  <p className="mt-1.5 text-xs font-medium text-feedback-danger" role="alert">
                    {t("pleaseChoose", { group: g.name })}
                  </p>
                )}
              </fieldset>
            );
          })}

          <div>
            <label htmlFor={`${titleId}-note`} className="text-base font-bold">
              {t("specialInstructions")}{" "}
              <span className="text-xs font-medium text-text-secondary">({t("optional")})</span>
            </label>
            <Textarea
              id={`${titleId}-note`}
              className="mt-2 min-h-[64px]"
              placeholder={t("specialPlaceholder")}
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Sheet>
  );
}
