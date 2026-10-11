"use client";

import { formatRs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCart } from "./cart";
import { QtyStepper } from "./qty-stepper";

/** Editable list of cart lines: name, chosen options, stepper, line total. */
export function CartLines({ className }: { className?: string }) {
  const { lines, setQuantity } = useCart();

  return (
    <ul className={cn("flex flex-col divide-y divide-border", className)}>
      {lines.map((l) => (
        <li key={l.key} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold leading-snug" dir="auto">
                {l.name}
              </p>
              {l.options.length > 0 && (
                <p className="mt-0.5 text-xs text-text-secondary" dir="auto">
                  {l.options
                    .map((o) =>
                      o.group.toLowerCase().includes("message") ? `“${o.choice}”` : o.choice,
                    )
                    .join(", ")}
                </p>
              )}
              {l.note && (
                <p className="mt-0.5 text-xs italic text-text-secondary" dir="auto">
                  {l.note}
                </p>
              )}
            </div>
            <p className="shrink-0 font-semibold tabular-nums">
              {formatRs(Math.round(l.unit_price * l.quantity))}
            </p>
          </div>
          <QtyStepper
            size="sm"
            value={l.quantity}
            step={l.qty_step}
            unit={l.unit}
            allowRemove
            onChange={(q) => setQuantity(l.key, q)}
            className="self-start"
          />
        </li>
      ))}
    </ul>
  );
}
