"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRs } from "@/lib/format";

/**
 * A selectable option (Figma "Option row"): radio for single-choice groups,
 * checkbox for multiple-choice groups. Shows "+ Rs 1,100" price delta.
 */
export function OptionRow({
  type,
  label,
  priceDelta,
  selected,
  disabled,
  onSelect,
}: {
  type: "single" | "multiple";
  label: string;
  priceDelta: number;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role={type === "single" ? "radio" : "checkbox"}
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-start text-[15px] transition-colors",
        selected
          ? "border-brand-primary bg-brand-primary-soft"
          : "border-border bg-surface-card hover:border-brand-primary/40",
        disabled && !selected && "opacity-50",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center border-2",
          type === "single" ? "rounded-full" : "rounded-md",
          selected ? "border-brand-primary bg-brand-primary" : "border-border bg-surface-card",
        )}
      >
        {selected &&
          (type === "single" ? (
            <span className="h-2 w-2 rounded-full bg-surface-card" />
          ) : (
            <Check className="h-3.5 w-3.5 text-text-inverse" strokeWidth={3} />
          ))}
      </span>
      <span className="flex-1 font-medium">{label}</span>
      <span className="text-sm text-text-secondary">
        {priceDelta > 0 ? `+ ${formatRs(priceDelta)}` : priceDelta < 0 ? formatRs(priceDelta) : formatRs(0)}
      </span>
    </button>
  );
}
