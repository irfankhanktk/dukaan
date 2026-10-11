"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { ShopStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { goLive } from "@/app/admin/shops/actions";
import { FormError, Section, StickyBar } from "./stepper";

export function GoLiveForm({
  shopId,
  currentStatus,
  defaultFee,
  defaultPaidUntil,
  blockers,
  warnings,
}: {
  shopId: string;
  currentStatus: ShopStatus;
  defaultFee: number;
  defaultPaidUntil: string | null;
  /** Reasons go-live is blocked (no owner, no products). */
  blockers: string[];
  /** Incomplete checklist items that don't block. */
  warnings: string[];
}) {
  const [status, setStatus] = useState<"trial" | "active">(currentStatus === "active" ? "active" : "trial");
  const [fee, setFee] = useState(String(defaultFee || ""));
  const [paidUntil, setPaidUntil] = useState(defaultPaidUntil ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isLive = currentStatus !== "setup";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blockers.length) return;
    if (warnings.length && !window.confirm(`Some setup items are not done yet:\n\n• ${warnings.join("\n• ")}\n\nGo live anyway?`)) {
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const res = await goLive({ shopId, status, monthly_fee: fee || "0", paid_until: paidUntil });
      if (res && !res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
      }
    });
  }

  const options = [
    { value: "trial" as const, title: "Trial", text: "Free trial period, shop takes orders." },
    { value: "active" as const, title: "Active", text: "Paying subscription, shop takes orders." },
  ];

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Section title={isLive ? "Status & plan" : "Go live"} description="Plan: Standard">
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Status">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={status === o.value}
              onClick={() => setStatus(o.value)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                status === o.value
                  ? "border-brand-primary bg-brand-primary-soft"
                  : "border-border bg-surface-card hover:bg-surface-bg",
              )}
            >
              <p className="font-semibold">{o.title}</p>
              <p className="text-sm text-text-secondary">{o.text}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Monthly fee (Rs)" htmlFor="monthly_fee" error={errors.monthly_fee}>
            <Input
              id="monthly_fee"
              inputMode="numeric"
              placeholder="1500"
              value={fee}
              onChange={(e) => setFee(e.target.value.replace(/[^\d]/g, ""))}
            />
          </Field>
          <Field label="Paid until (optional)" htmlFor="paid_until" error={errors.paid_until}>
            <Input id="paid_until" type="date" value={paidUntil} onChange={(e) => setPaidUntil(e.target.value)} />
          </Field>
        </div>

        {blockers.length > 0 && (
          <div className="mt-4 rounded-xl bg-status-rejected-bg px-4 py-3 text-sm text-status-rejected-fg">
            <p className="font-semibold">Can&apos;t go live yet</p>
            <ul className="mt-1 list-disc ps-5">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        {blockers.length === 0 && warnings.length > 0 && (
          <div className="mt-4 flex gap-2 rounded-xl bg-brand-accent-soft px-4 py-3 text-sm text-status-new-fg">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Not finished: {warnings.join(", ")}. You can still go live and finish these later.
            </p>
          </div>
        )}
      </Section>

      <FormError message={formError} />

      <StickyBar>
        <Button type="submit" size="lg" disabled={pending || blockers.length > 0}>
          {pending && <Loader2 className="animate-spin" />}
          {isLive ? "Save status" : "Go live"}
        </Button>
      </StickyBar>
    </form>
  );
}
