"use client";

import { useState } from "react";
import { Pencil, Plus, Type, X } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { formatRs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BusinessType, OptionGroup } from "@/lib/types";
import { QUICK_START, getTemplate, textChipLabel, type GroupTemplate, type TemplateKey } from "./templates";

export type EditorValue = { key: string; id?: string; name: string; price: string };
export type EditorGroup = {
  key: string;
  id?: string;
  name: string;
  type: "single" | "multiple" | "text";
  is_required: boolean;
  min_select: number;
  max_select: number | null;
  values: EditorValue[];
  /** UI only: card expanded for editing */
  open: boolean;
};

let keySeq = 0;
export const newKey = () => `k${++keySeq}`;

export function groupsFromProduct(groups: OptionGroup[]): EditorGroup[] {
  return [...groups]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((g) => ({
      key: g.id,
      id: g.id,
      name: g.name,
      type: g.type,
      is_required: g.is_required,
      min_select: g.min_select,
      max_select: g.type === "multiple" ? g.max_select : g.type === "single" ? 1 : null,
      open: false,
      values: [...(g.option_values ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((v) => ({ key: v.id, id: v.id, name: v.name, price: String(v.price_delta) })),
    }));
}

function groupFromTemplate(t: GroupTemplate): EditorGroup {
  return {
    key: newKey(),
    name: t.name,
    type: t.type,
    is_required: t.is_required,
    min_select: t.type === "single" && t.is_required ? 1 : 0,
    max_select: t.max_select,
    open: true,
    values: t.values.map((v) => ({ key: newKey(), name: v.name, price: String(v.price_delta) })),
  };
}

export function parsePrice(s: string): number {
  const n = Number(s.trim() === "" || s.trim() === "-" ? 0 : s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function summary(g: EditorGroup): string {
  if (g.type === "text") return `${g.is_required ? "Required" : "Optional"} · Customer types a message`;
  if (g.type === "single") return g.is_required ? "Required · Pick 1" : "Optional · Pick 1";
  const max = g.max_select ? `Up to ${g.max_select}` : "Pick any";
  return `${g.is_required ? "Required" : "Optional"} · ${max}`;
}

const chip =
  "inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-colors";

export function OptionGroupsEditor({
  groups,
  onChange,
  businessType,
  basePrice,
}: {
  groups: EditorGroup[];
  onChange: (groups: EditorGroup[]) => void;
  businessType: BusinessType;
  basePrice: number;
}) {
  const update = (key: string, patch: Partial<EditorGroup>) =>
    onChange(groups.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  const remove = (key: string) => onChange(groups.filter((g) => g.key !== key));

  function addTemplate(key: TemplateKey) {
    const t = getTemplate(key, businessType);
    // Avoid duplicate names ("Size", "Size 2"…)
    const names = new Set(groups.map((g) => g.name.toLowerCase()));
    let name = t.name;
    for (let i = 2; names.has(name.toLowerCase()); i++) name = `${t.name} ${i}`;
    onChange([...groups, groupFromTemplate({ ...t, name })]);
  }

  function addCustom() {
    onChange([
      ...groups,
      {
        key: newKey(),
        name: "",
        type: "single",
        is_required: false,
        min_select: 0,
        max_select: 1,
        open: true,
        values: [
          { key: newKey(), name: "", price: "0" },
          { key: newKey(), name: "", price: "0" },
        ],
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {QUICK_START.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => addTemplate(q.key)}
            className={cn(chip, "border-dashed border-brand-primary/50 bg-brand-primary-soft text-brand-primary hover:bg-brand-primary/10")}
          >
            {q.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => addTemplate("text")}
          className={cn(chip, "border-dashed border-brand-primary/50 bg-brand-primary-soft text-brand-primary hover:bg-brand-primary/10")}
        >
          {textChipLabel(businessType)}
        </button>
      </div>

      {groups.map((g) => (
        <GroupCard
          key={g.key}
          group={g}
          basePrice={basePrice}
          onUpdate={(patch) => update(g.key, patch)}
          onRemove={() => remove(g.key)}
        />
      ))}

      <button
        type="button"
        onClick={addCustom}
        className="flex h-12 items-center justify-center gap-2 rounded-card border-2 border-dashed border-border text-sm font-medium text-text-secondary hover:border-brand-primary/40 hover:text-brand-primary"
      >
        <Plus className="h-4 w-4" /> Custom option group
      </button>
    </div>
  );
}

function GroupCard({
  group: g,
  basePrice,
  onUpdate,
  onRemove,
}: {
  group: EditorGroup;
  basePrice: number;
  onUpdate: (patch: Partial<EditorGroup>) => void;
  onRemove: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);

  const setValues = (values: EditorValue[]) => {
    const patch: Partial<EditorGroup> = { values };
    if (g.type === "multiple" && g.max_select && g.max_select > Math.max(1, values.length)) {
      patch.max_select = Math.max(1, values.length);
    }
    onUpdate(patch);
  };

  function setType(type: EditorGroup["type"]) {
    if (type === g.type) return;
    const patch: Partial<EditorGroup> = { type };
    if (type === "single") patch.max_select = 1;
    if (type === "multiple") patch.max_select = null;
    if (type === "text") patch.max_select = null;
    if (type !== "text" && g.values.length === 0) {
      patch.values = [{ key: newKey(), name: "", price: "0" }];
    }
    onUpdate(patch);
  }

  if (!g.open) {
    // Collapsed summary (Figma "Edit product": group card with pencil)
    return (
      <div className="rounded-card border border-border bg-surface-card p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-text-primary">{g.name || "Untitled group"}</p>
            <p className="text-xs text-text-secondary">{summary(g)}</p>
          </div>
          <button
            type="button"
            aria-label={`Edit ${g.name}`}
            onClick={() => onUpdate({ open: true })}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-brand-primary-soft hover:text-brand-primary"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
        {g.type !== "text" && g.values.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {g.values.map((v) => {
              const delta = parsePrice(v.price);
              return (
                <li
                  key={v.key}
                  className="flex items-center justify-between rounded-lg bg-surface-bg px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium">{v.name || "—"}</span>
                  <span className="text-text-secondary">
                    {g.type === "single" ? formatRs(basePrice + delta) : delta ? `+ ${formatRs(delta)}` : "Free"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  const maxChoices = Math.max(1, g.values.length);

  return (
    <div className="rounded-card border border-brand-primary bg-brand-primary-soft p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <input
            value={g.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Group name, e.g. Size"
            aria-label="Option group name"
            maxLength={40}
            className="w-full rounded-lg bg-transparent px-1 py-0.5 text-[15px] font-semibold text-text-primary placeholder:font-normal placeholder:text-text-secondary/70 focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
          <p className="px-1 text-xs text-text-secondary">{summary(g)}</p>
        </div>
        {g.id && (
          <button
            type="button"
            onClick={() => onUpdate({ open: false })}
            className="h-8 rounded-full px-2 text-xs font-semibold text-brand-primary hover:bg-surface-card"
          >
            Done
          </button>
        )}
        {confirmRemove ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRemove}
              className="h-8 rounded-full bg-feedback-danger px-3 text-xs font-semibold text-text-inverse"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              className="h-8 rounded-full px-2 text-xs font-medium text-text-secondary"
            >
              Keep
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Remove option group"
            onClick={() => (g.id ? setConfirmRemove(true) : onRemove())}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-surface-card hover:text-feedback-danger"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Required / type chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={g.is_required}
          onClick={() => onUpdate({ is_required: !g.is_required })}
          className={cn(
            chip,
            g.is_required
              ? "border-brand-primary bg-brand-primary text-text-inverse"
              : "border-border bg-surface-card text-text-primary",
          )}
        >
          {g.is_required ? "Required" : "Optional"}
        </button>
        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
        {(
          [
            ["single", "Pick 1"],
            ["multiple", "Pick many"],
            ["text", "Text"],
          ] as const
        ).map(([type, label]) => (
          <button
            key={type}
            type="button"
            aria-pressed={g.type === type}
            onClick={() => setType(type)}
            className={cn(
              chip,
              g.type === type
                ? "border-brand-primary bg-brand-primary text-text-inverse"
                : "border-border bg-surface-card text-text-primary hover:border-brand-primary/40",
            )}
          >
            {label}
          </button>
        ))}
        {g.type === "multiple" && (
          <label className="ml-auto flex items-center gap-2 text-xs font-medium text-text-secondary">
            Up to
            <Select
              value={g.max_select ?? ""}
              onChange={(e) => onUpdate({ max_select: e.target.value ? Number(e.target.value) : null })}
              className="h-8 w-auto rounded-full px-3 pr-8 text-xs"
            >
              <option value="">No limit</option>
              {Array.from({ length: maxChoices }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>

      {g.type === "text" ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-brand-primary/40 bg-surface-card px-3 py-3 text-sm text-text-secondary">
          <Type className="h-4 w-4 shrink-0 text-brand-primary" />
          Customers type a short message (up to 200 characters). No extra charge.
        </div>
      ) : (
        <div className="mt-3">
          <div className="grid grid-cols-[1fr_7rem_2rem] gap-2 px-1 pb-1 text-xs font-medium text-text-secondary">
            <span>Choice</span>
            <span>Extra price</span>
            <span />
          </div>
          <div className="flex flex-col gap-2">
            {g.values.map((v, i) => (
              <div key={v.key} className="grid grid-cols-[1fr_7rem_2rem] items-center gap-2">
                <Input
                  value={v.name}
                  onChange={(e) =>
                    setValues(g.values.map((x) => (x.key === v.key ? { ...x, name: e.target.value } : x)))
                  }
                  placeholder={i === 0 ? "e.g. Small (8 inch)" : "Choice name"}
                  aria-label="Choice name"
                  maxLength={60}
                  className="h-10 rounded-lg px-3 text-sm"
                />
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                    + Rs
                  </span>
                  <Input
                    value={v.price}
                    inputMode="numeric"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d-]/g, "").replace(/(?!^)-/g, "");
                      setValues(g.values.map((x) => (x.key === v.key ? { ...x, price: raw } : x)));
                    }}
                    aria-label="Extra price in rupees"
                    className="h-10 rounded-lg pl-11 pr-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Remove choice"
                  disabled={g.values.length <= 1}
                  onClick={() => setValues(g.values.filter((x) => x.key !== v.key))}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-surface-card hover:text-feedback-danger disabled:opacity-30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setValues([...g.values, { key: newKey(), name: "", price: "0" }])}
            className="mt-2 inline-flex items-center gap-1.5 px-1 py-1 text-sm font-semibold text-brand-primary hover:underline"
          >
            <Plus className="h-4 w-4" /> Add choice
          </button>
        </div>
      )}
    </div>
  );
}
