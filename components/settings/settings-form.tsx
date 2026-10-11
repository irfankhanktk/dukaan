"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { updateShopSettings } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { formatPhone } from "@/lib/format";
import { DAY_LABELS, fullWeek } from "@/lib/hours";
import { DAY_KEYS, type DayHours, type DayKey, type DeliveryArea, type Shop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { COVER_COLORS, type FormState } from "./shop-schema";

export function SettingsForm({ shop }: { shop: Shop }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateShopSettings, {});
  const [isOpen, setIsOpen] = useState(shop.is_open);
  const [cover, setCover] = useState(shop.cover_color || COVER_COLORS[0].value);
  const err = state.errors ?? {};
  const hours = shop.opening_hours ?? {};
  // Rows below are client state (kept across failed saves) submitted as JSON hidden inputs.
  const [pickup, setPickup] = useState(shop.pickup_enabled);
  const [mode, setMode] = useState<"flat" | "areas">(shop.delivery_areas?.length ? "areas" : "flat");
  const [areas, setAreas] = useState<{ name: string; fee: string }[]>(() =>
    (shop.delivery_areas ?? []).map((a: DeliveryArea) => ({ name: a.name, fee: String(a.fee) })),
  );
  const [days, setDays] = useState<Record<DayKey, DayHours>>(() => fullWeek(hours));

  const areasJson = JSON.stringify(
    areas.map((a) => ({ name: a.name.trim(), fee: a.fee.trim() === "" ? 0 : Number(a.fee) })),
  );
  const setDay = (d: DayKey, patch: Partial<DayHours>) =>
    setDays((prev) => ({ ...prev, [d]: { ...prev[d], ...patch } }));
  const copyMondayToAll = () =>
    setDays((prev) => Object.fromEntries(DAY_KEYS.map((d) => [d, { ...prev.mon }])) as Record<DayKey, DayHours>);
  // After a failed save, keep what the user typed (React resets uncontrolled fields).
  const val = (key: string, fallback: string | number) => state.values?.[key] ?? String(fallback);

  return (
    <form key={state.values ? JSON.stringify(state.values) : "initial"} action={formAction} className="flex flex-col gap-4 md:gap-6">
      {/* Taking orders */}
      <Card className="flex items-center justify-between gap-4 p-4 md:p-5">
        <div>
          <p className="text-[15px] font-bold text-text-primary">Taking orders</p>
          <p className="text-sm text-text-secondary">
            {isOpen ? "Customers can place orders now." : "Your shop shows as closed."}
          </p>
        </div>
        <Switch name="is_open" checked={isOpen} onChange={setIsOpen} label="Taking orders" />
      </Card>

      <Card className="p-4 md:p-6">
        <h2 className="text-[15px] font-bold text-text-primary">Shop details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Shop name" htmlFor="name" error={err.name}>
            <Input id="name" name="name" defaultValue={val("name", shop.name)} required aria-invalid={!!err.name} />
          </Field>
          <Field label="City" htmlFor="city" error={err.city}>
            <Input id="city" name="city" defaultValue={val("city", shop.city ?? "")} placeholder="Rawalpindi" aria-invalid={!!err.city} />
          </Field>
          <Field label="Area / address" htmlFor="area" error={err.area} hint="e.g. Satellite Town">
            <Input id="area" name="area" defaultValue={val("area", shop.area ?? "")} aria-invalid={!!err.area} />
          </Field>
          <Field
            label="WhatsApp number"
            htmlFor="whatsapp_number"
            error={err.whatsapp_number}
            hint="Orders arrive on this number"
          >
            <Input
              id="whatsapp_number"
              name="whatsapp_number"
              type="tel"
              inputMode="tel"
              defaultValue={val("whatsapp_number", formatPhone(shop.whatsapp_number))}
              placeholder="0300 1234567"
              required
              aria-invalid={!!err.whatsapp_number}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-4 md:p-6">
        <h2 className="text-[15px] font-bold text-text-primary">Delivery & pickup</h2>
        <input type="hidden" name="delivery_mode" value={mode} />
        <input type="hidden" name="delivery_areas" value={mode === "areas" ? areasJson : "[]"} />
        <div className="mt-4 inline-flex rounded-full border border-border bg-surface-bg p-1" role="radiogroup" aria-label="Delivery fee">
          {(
            [
              ["flat", "One fee everywhere"],
              ["areas", "Fee per area"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => {
                setMode(m);
                if (m === "areas" && areas.length === 0) setAreas([{ name: "", fee: "" }]);
              }}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                mode === m ? "bg-brand-primary text-text-inverse" : "text-text-primary hover:bg-brand-primary-soft",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {mode === "flat" ? (
            <Field label="Delivery fee (Rs)" htmlFor="delivery_fee" error={err.delivery_fee}>
              <Input
                id="delivery_fee"
                name="delivery_fee"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                defaultValue={val("delivery_fee", shop.delivery_fee)}
                aria-invalid={!!err.delivery_fee}
              />
            </Field>
          ) : (
            <div className="md:col-span-2">
              {/* Keep the flat fee unchanged while per-area fees are used. */}
              <input type="hidden" name="delivery_fee" value={shop.delivery_fee} />
              <p className="text-[13px] font-medium text-text-secondary">Delivery areas</p>
              <ul className="mt-2 flex flex-col gap-2">
                {areas.map((a, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Input
                      aria-label={`Area ${i + 1} name`}
                      value={a.name}
                      onChange={(e) => setAreas((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      placeholder="e.g. Satellite Town"
                      maxLength={60}
                      className="min-w-0 flex-1"
                    />
                    <div className="relative w-28 shrink-0">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">
                        Rs
                      </span>
                      <Input
                        aria-label={`Area ${i + 1} delivery fee`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={a.fee}
                        onChange={(e) => setAreas((prev) => prev.map((x, j) => (j === i ? { ...x, fee: e.target.value } : x)))}
                        placeholder="0"
                        className="pl-9 pr-2"
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove area ${i + 1}`}
                      onClick={() => setAreas((prev) => prev.filter((_, j) => j !== i))}
                      className="flex h-12 w-11 shrink-0 items-center justify-center rounded-xl text-text-secondary hover:bg-status-rejected-bg hover:text-feedback-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setAreas((prev) => [...prev, { name: "", fee: "" }])}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-semibold text-brand-primary hover:bg-brand-primary-soft"
              >
                <Plus className="h-4 w-4" /> Add area
              </button>
              {err.delivery_areas ? (
                <p className="mt-1 text-xs text-feedback-danger">{err.delivery_areas}</p>
              ) : (
                <p className="mt-1 text-xs text-text-secondary">
                  Customers pick their area at checkout; only these areas can order delivery.
                </p>
              )}
            </div>
          )}
          <Field label="Minimum order (Rs)" htmlFor="min_order" error={err.min_order} hint="0 = no minimum">
            <Input
              id="min_order"
              name="min_order"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={val("min_order", shop.min_order)}
              aria-invalid={!!err.min_order}
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">Pickup from shop</p>
            <p className="text-xs text-text-secondary">
              {pickup ? "Customers can choose to collect their order." : "Delivery only."}
            </p>
          </div>
          <Switch name="pickup_enabled" checked={pickup} onChange={setPickup} label="Pickup from shop" />
        </div>
      </Card>

      <Card className="p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-text-primary">Opening hours</h2>
          <button
            type="button"
            onClick={copyMondayToAll}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-brand-primary hover:bg-brand-primary-soft"
          >
            <Copy className="h-4 w-4" /> Copy Monday to all
          </button>
        </div>
        <p className="text-sm text-text-secondary">Shown to customers. Use “Taking orders” to stop orders.</p>
        <input type="hidden" name="days" value={JSON.stringify(days)} />
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {DAY_KEYS.map((d) => {
            const day = days[d];
            return (
              <li key={d} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                <span className="w-24 text-sm font-medium text-text-primary">{DAY_LABELS[d]}</span>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={day.closed}
                    onChange={(e) => setDay(d, { closed: e.target.checked })}
                    className="h-4 w-4 accent-brand-primary"
                  />
                  Closed
                </label>
                {!day.closed && (
                  <div className="flex flex-1 items-center gap-2 sm:justify-end">
                    <Input
                      type="time"
                      aria-label={`${DAY_LABELS[d]} opens`}
                      value={day.open}
                      onChange={(e) => setDay(d, { open: e.target.value })}
                      required
                      className="h-10 w-[7.5rem] px-3 text-sm"
                    />
                    <span className="text-sm text-text-secondary">to</span>
                    <Input
                      type="time"
                      aria-label={`${DAY_LABELS[d]} closes`}
                      value={day.close}
                      onChange={(e) => setDay(d, { close: e.target.value })}
                      required
                      className="h-10 w-[7.5rem] px-3 text-sm"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {err.days && <p className="mt-2 text-xs text-feedback-danger">{err.days}</p>}
        <Field
          label="Preparation time"
          htmlFor="prep_time"
          error={err.prep_time}
          hint="Shown to customers, e.g. 30–45 min"
          className="mt-4"
        >
          <Input
            id="prep_time"
            name="prep_time"
            defaultValue={val("prep_time", hours.prep_time ?? "")}
            placeholder="30–45 min"
            aria-invalid={!!err.prep_time}
          />
        </Field>
      </Card>

      <Card className="p-4 md:p-6">
        <h2 className="text-[15px] font-bold text-text-primary">Shop colour</h2>
        <p className="text-sm text-text-secondary">Used for the header of your shop page.</p>
        <fieldset className="mt-4 flex flex-wrap gap-3">
          <legend className="sr-only">Shop colour</legend>
          {COVER_COLORS.map((c) => (
            <label key={c.value} className="cursor-pointer" title={c.name}>
              <input
                type="radio"
                name="cover_color"
                value={c.value}
                checked={cover.toUpperCase() === c.value}
                onChange={() => setCover(c.value)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary",
                  cover.toUpperCase() === c.value && "ring-2 ring-text-primary",
                )}
                style={{ backgroundColor: c.value }}
              >
                {cover.toUpperCase() === c.value && <Check className="h-5 w-5 text-white" aria-hidden />}
                <span className="sr-only">{c.name}</span>
              </span>
            </label>
          ))}
          {/* Keep a custom colour set by the admin selectable */}
          {!COVER_COLORS.some((c) => c.value === shop.cover_color.toUpperCase()) && (
            <label className="cursor-pointer" title="Current colour">
              <input
                type="radio"
                name="cover_color"
                value={shop.cover_color}
                checked={cover === shop.cover_color}
                onChange={() => setCover(shop.cover_color)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full ring-offset-2",
                  cover === shop.cover_color && "ring-2 ring-text-primary",
                )}
                style={{ backgroundColor: shop.cover_color }}
              >
                <span className="sr-only">Current colour</span>
              </span>
            </label>
          )}
        </fieldset>
        {err.cover_color && <p className="mt-2 text-xs text-feedback-danger">{err.cover_color}</p>}
      </Card>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex items-center gap-3 border-t border-border bg-surface-bg/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" disabled={pending} className="flex-1 md:flex-none md:px-8">
          {pending && <Loader2 className="animate-spin" />}
          Save changes
        </Button>
        {state.message && (
          <p
            role="status"
            className={cn("text-sm font-medium", state.ok ? "text-status-delivered-fg" : "text-feedback-danger")}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

/** Pill switch backed by a real checkbox so it submits with the form. */
export function Switch({
  name,
  checked,
  onChange,
  label,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
        role="switch"
        aria-label={label}
      />
      <span className="h-8 w-14 rounded-full bg-border transition-colors peer-checked:bg-brand-primary peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary peer-focus-visible:ring-offset-2" />
      <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-6" />
    </label>
  );
}
