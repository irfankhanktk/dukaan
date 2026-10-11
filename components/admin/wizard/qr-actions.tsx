"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setQrPlaced } from "@/app/admin/shops/actions";

/** Print (A4/A5 → "Save as PDF") and "Mark QR as placed" for the QR poster page. */
export function QrActions({ shopId, placedAt }: { shopId: string; placedAt: string | null }) {
  const router = useRouter();
  const [size, setSize] = useState<"A4" | "A5">("A5");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 print:hidden">
      {/* Page size for the browser's print dialog */}
      <style>{`@page { size: ${size}; margin: 10mm; }`}</style>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-btn border border-border bg-surface-card p-1" role="radiogroup" aria-label="Paper size">
          {(["A5", "A4"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={size === s}
              onClick={() => setSize(s)}
              className={
                size === s
                  ? "h-9 rounded-[10px] bg-brand-primary px-4 text-sm font-semibold text-text-inverse"
                  : "h-9 rounded-[10px] px-4 text-sm font-semibold text-text-secondary"
              }
            >
              {s}
            </button>
          ))}
        </div>
        <Button type="button" onClick={() => window.print()}>
          <Printer /> Print / Save as PDF
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await setQrPlaced(shopId, !placedAt);
              if (!res.ok) setError(res.error);
              else {
                setError(null);
                router.refresh();
              }
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : placedAt ? <Check /> : null}
          {placedAt ? "QR placed · undo" : "Mark QR as placed"}
        </Button>
      </div>
      {error && <p className="text-sm text-feedback-danger">{error}</p>}
    </div>
  );
}
