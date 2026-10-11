"use client";

import { useState, useTransition } from "react";
import { Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Switch } from "@/components/menu/switch";
import { DAY_LABELS } from "@/lib/hours";
import { DAY_KEYS, type DayHours, type DayKey, type DeliveryArea } from "@/lib/types";
import { cn } from "@/lib/utils";
import { saveDeliveryHours } from "@/app/admin/shops/actions";
import { FormError, Section, StickyBar } from "./stepper";

export type DeliveryDefaults = {
  delivery_fee: number;
  delivery_areas: DeliveryArea[];
  min_order: number;
  pickup_enabled: boolean;
  prep_time: string;
  days: Record<DayKey, DayHours>;
};

type AreaRow = { key: string; name: string; fee: string };

let rowSeq = 0;
const rowKey = () => `a${++rowSeq}`;
const digits = (s: string) => s.replace(/[^\d]/g, "");

export function StepDelivery({ shopId, defaults }: { shopId: string; defaults: DeliveryDefaults }) {
  const [mode, setMode] = useState<"flat" | "areas">(defaults.delivery_areas.length ? "areas" : "flat");
  const [fee, setFee] = useState(String(defaults.delivery_fee));
  const [areas, setAreas] = useState<AreaRow[]>(() =>
    defaults.delivery_areas.length
      ? defaults.delivery_areas.map((a) => ({ key: rowKey(), name: a.name, fee: String(a.fee) }))
      : [{ key: rowKey(), name: "", fee: "" }],
  );
  const [minOrder, setMinOrder] = useState(String(defaults.min_order));
  const [pickup, setPickup] = useState(defaults.pickup_enabled);
  const [prep, setPrep] = useState(defaults.prep_time);
  const [days, setDays] = useState(defaults.days);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setDay = (d: DayKey, patch: Partial<DayHours>) =>
    setDays((prev) => ({ ...prev, [d]: { ...prev[d], ...patch } }));
  const setArea = (key: string, patch: Partial<AreaRow>) =>
    setAreas((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const filled = areas.filter((a) => a.name.trim() || a.fee.trim());
    startTransition(async () => {
      const res = await saveDeliveryHours({
        shopId,
        mode,
        delivery_fee: fee || "0",
        delivery_areas: filled.map((a) => ({ name: a.name, fee: a.fee || "0" })),
        min_order: minOrder || "0",
        pickup_enabled: pickup,
        prep_time: prep,
        days,
      });
      if (res && !res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
      }
    });
  }

  const areaError =
    errors.delivery_areas ?? Object.entries(errors).find(([k]) => k.startsWith("delivery_areas."))?.[1];
  const dayError = (d: DayKey) => errors[`days.${d}.open`] || errors[`days.${d}.close`];

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Section title="Delivery" description="Customers choose delivery or pickup at checkout.">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-bg p-1" role="radiogroup" aria-label="Delivery fee">
          {(
            [
              ["flat", "Same fee everywhere"],
              ["areas", "Fee per area"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "h-11 rounded-lg text-sm font-semibold transition-colors",
                mode === m ? "bg-surface-card text-brand-primary shadow-sm" : "text-text-secondary",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "flat" ? (
          <Field label="Delivery fee (Rs)" htmlFor="delivery_fee" error={errors.delivery_fee} className="mt-4 md:max-w-xs">
            <Input
              id="delivery_fee"
              inputMode="numeric"
              value={fee}
              placeholder="100"
              onChange={(e) => setFee(digits(e.target.value))}
            />
          </Field>
        ) : (
          <div className="mt-4 space-y-2">
            {areas.map((a, i) => (
              <div key={a.key} className="flex items-center gap-2">
                <Input
                  aria-label={`Area ${i + 1} name`}
                  placeholder="Satellite Town"
                  value={a.name}
                  className="min-w-0 flex-1"
                  onChange={(e) => setArea(a.key, { name: e.target.value })}
                />
                <div className="relative w-28 shrink-0">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">
                    Rs
                  </span>
                  <Input
                    aria-label={`Area ${i + 1} fee`}
                    inputMode="numeric"
                    placeholder="100"
                    value={a.fee}
                    className="pl-9"
                    onChange={(e) => setArea(a.key, { fee: digits(e.target.value) })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 shrink-0 text-feedback-danger"
                  aria-label="Remove area"
                  disabled={areas.length === 1}
                  onClick={() => setAreas((prev) => prev.filter((r) => r.key !== a.key))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {areaError && <p className="text-xs text-feedback-danger">{areaError}</p>}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAreas((prev) => [...prev, { key: rowKey(), name: "", fee: "" }])}
            >
              <Plus /> Add area
            </Button>
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Minimum order (Rs)" htmlFor="min_order" error={errors.min_order} hint="0 = no minimum">
            <Input
              id="min_order"
              inputMode="numeric"
              value={minOrder}
              onChange={(e) => setMinOrder(digits(e.target.value))}
            />
          </Field>
          <Field label="Preparation time" htmlFor="prep_time" error={errors.prep_time} hint="Shown on the shop page">
            <Input id="prep_time" value={prep} placeholder="30–45 min" onChange={(e) => setPrep(e.target.value)} />
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-border p-4">
          <div>
            <p className="font-semibold">Pickup from shop</p>
            <p className="text-sm text-text-secondary">Customers can collect the order themselves.</p>
          </div>
          <Switch checked={pickup} onCheckedChange={setPickup} label="Pickup from shop" />
        </div>
      </Section>

      <Section
        title="Opening hours"
        description="Shown to customers. The owner can also switch ordering on/off from the dashboard."
      >
        <div className="mb-3 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setDays((prev) => {
                const out = { ...prev };
                for (const d of DAY_KEYS) out[d] = { ...prev.mon };
                return out;
              })
            }
          >
            <Copy /> Copy Monday to all
          </Button>
        </div>
        <ul className="divide-y divide-border">
          {DAY_KEYS.map((d) => {
            const day = days[d];
            return (
              <li key={d} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <span className="w-24 shrink-0 font-medium">{DAY_LABELS[d]}</span>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Switch
                    checked={!day.closed}
                    onCheckedChange={(open) => setDay(d, { closed: !open })}
                    label={`${DAY_LABELS[d]} open`}
                  />
                  <span className="w-12">{day.closed ? "Closed" : "Open"}</span>
                </div>
                {!day.closed && (
                  <div className="flex w-full items-center gap-2 sm:ms-auto sm:w-auto">
                    <Input
                      type="time"
                      aria-label={`${DAY_LABELS[d]} opens`}
                      value={day.open}
                      className="h-11 flex-1 px-3 sm:w-32"
                      onChange={(e) => setDay(d, { open: e.target.value })}
                    />
                    <span className="text-sm text-text-secondary">to</span>
                    <Input
                      type="time"
                      aria-label={`${DAY_LABELS[d]} closes`}
                      value={day.close}
                      className="h-11 flex-1 px-3 sm:w-32"
                      onChange={(e) => setDay(d, { close: e.target.value })}
                    />
                  </div>
                )}
                {dayError(d) && <p className="w-full text-xs text-feedback-danger">{dayError(d)}</p>}
              </li>
            );
          })}
        </ul>
      </Section>

      <FormError message={formError} />

      <StickyBar>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Save & continue
        </Button>
      </StickyBar>
    </form>
  );
}
