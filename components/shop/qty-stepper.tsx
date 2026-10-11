"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatQty } from "@/lib/format";
import type { Unit } from "@/lib/types";
import { useLang } from "./language";
import { roundQty } from "./pricing";

/**
 * − qty + stepper. Steps by `step` (0.5 for kg). Going below `min` calls onChange(0)
 * when `allowRemove` (cart lines), otherwise it stops at `min`.
 */
export function QtyStepper({
  value,
  step,
  unit,
  min,
  allowRemove = false,
  size = "md",
  onChange,
  className,
}: {
  value: number;
  step: number;
  unit: Unit;
  min?: number;
  allowRemove?: boolean;
  size?: "sm" | "md";
  onChange: (next: number) => void;
  className?: string;
}) {
  const { t } = useLang();
  const s = step > 0 ? step : 1;
  const floor = min ?? s;
  const atMin = roundQty(value - s) < floor;
  const removing = allowRemove && atMin;
  const btn = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const label = unit === "kg" ? formatQty(value, unit) : String(value);

  return (
    <div
      dir="ltr"
      className={cn(
        "inline-flex items-center rounded-btn border border-border bg-surface-card",
        className,
      )}
    >
      <button
        type="button"
        aria-label={t("decrease")}
        disabled={atMin && !allowRemove}
        onClick={() => onChange(removing ? 0 : roundQty(value - s))}
        className={cn(
          btn,
          "flex items-center justify-center rounded-btn text-brand-primary transition-colors hover:bg-brand-primary-soft disabled:opacity-40",
          removing && "text-feedback-danger hover:bg-feedback-danger/5",
        )}
      >
        {removing ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>
      <span
        aria-live="polite"
        className={cn(
          "min-w-[2.5rem] px-1 text-center font-semibold tabular-nums",
          size === "sm" ? "text-sm" : "text-base",
        )}
      >
        {label}
      </span>
      <button
        type="button"
        aria-label={t("increase")}
        disabled={value >= 1000}
        onClick={() => onChange(roundQty(value + s))}
        className={cn(
          btn,
          "flex items-center justify-center rounded-btn text-brand-primary transition-colors hover:bg-brand-primary-soft disabled:opacity-40",
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
