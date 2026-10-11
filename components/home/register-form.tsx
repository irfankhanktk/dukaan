"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import {
  submitShopRequest,
  type ShopRequestField,
  type ShopRequestState,
} from "@/app/actions/shop-request";
import {
  FORM_BUSINESS_TYPES,
  PREFERRED_TIMES,
  type HomeStrings,
} from "@/lib/home-i18n";
import type { BusinessType } from "@/lib/types";

const SENT_KEY = "dukaan:shop-request-sent";
const SENT_EVENT = "dukaan:shop-request-sent";
const RECENT_MS = 60 * 60 * 1000;

const initialState: ShopRequestState = { status: "idle" };

// Device-level guard: remember a successful submission for an hour (best effort).
function readRecentlySent(): boolean {
  try {
    const at = Number(window.localStorage.getItem(SENT_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < RECENT_MS;
  } catch {
    return false;
  }
}
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(SENT_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(SENT_EVENT, cb);
  };
}
function writeSent(value: number | null) {
  try {
    if (value === null) window.localStorage.removeItem(SENT_KEY);
    else window.localStorage.setItem(SENT_KEY, String(value));
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new Event(SENT_EVENT));
}

export function RegisterForm({
  t,
  businessLabels,
}: {
  t: HomeStrings["register"];
  businessLabels: Record<BusinessType, string>;
}) {
  const [state, formAction, pending] = useActionState(submitShopRequest, initialState);
  const recentlySent = useSyncExternalStore(subscribe, readRecentlySent, () => false);
  const [dismissed, setDismissed] = useState<ShopRequestState | null>(null);

  useEffect(() => {
    if (state.status === "success") writeSent(Date.now());
  }, [state]);

  const showSuccess = recentlySent || (state.status === "success" && state !== dismissed);

  if (showSuccess) {
    return (
      <div
        role="status"
        className="flex flex-col items-center rounded-card border border-border bg-surface-card p-8 text-center"
      >
        <CheckCircle2 className="h-12 w-12 text-brand-whatsapp" aria-hidden />
        <h3 className="mt-3 text-xl font-bold">{t.successTitle}</h3>
        <p className="mt-1 text-text-secondary">{t.successBody}</p>
        <button
          type="button"
          onClick={() => {
            setDismissed(state);
            writeSent(null);
          }}
          className="mt-5 text-sm font-semibold text-brand-primary underline-offset-4 hover:underline"
        >
          {t.sendAnother}
        </button>
      </div>
    );
  }

  const err = (f: ShopRequestField) => {
    const code = state.fieldErrors?.[f];
    return code ? t.errors[code] : undefined;
  };
  const v = (f: ShopRequestField) => state.values?.[f] ?? "";
  const fieldProps = (f: ShopRequestField) => ({
    id: `req-${f}`,
    name: f,
    "aria-invalid": err(f) ? true : undefined,
    "aria-describedby": err(f) ? `req-${f}-error` : undefined,
  });
  const errorNode = (f: ShopRequestField) =>
    err(f) ? <span id={`req-${f}-error`}>{err(f)}</span> : undefined;

  return (
    <form
      action={formAction}
      noValidate
      className="relative rounded-card border border-border bg-surface-card p-5 shadow-sm md:p-6"
    >
      {/* Honeypot — invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="req-website">Website</label>
        <input id="req-website" type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.ownerName} htmlFor="req-owner_name" error={errorNode("owner_name")}>
          <Input
            {...fieldProps("owner_name")}
            autoComplete="name"
            placeholder={t.ownerNamePlaceholder}
            defaultValue={v("owner_name")}
            maxLength={80}
            required
          />
        </Field>
        <Field label={t.shopName} htmlFor="req-shop_name" error={errorNode("shop_name")}>
          <Input
            {...fieldProps("shop_name")}
            autoComplete="organization"
            placeholder={t.shopNamePlaceholder}
            defaultValue={v("shop_name")}
            maxLength={100}
            required
          />
        </Field>
        <Field
          label={t.businessType}
          htmlFor="req-business_type"
          error={errorNode("business_type")}
          className="sm:col-span-2"
        >
          <Select
            {...fieldProps("business_type")}
            defaultValue={v("business_type")}
            required
          >
            <option value="" disabled>
              {t.chooseType}
            </option>
            {FORM_BUSINESS_TYPES.map((b) => (
              <option key={b} value={b}>
                {businessLabels[b]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t.city} htmlFor="req-city" error={errorNode("city")}>
          <Input
            {...fieldProps("city")}
            autoComplete="address-level2"
            placeholder={t.cityPlaceholder}
            defaultValue={v("city")}
            maxLength={60}
            required
          />
        </Field>
        <Field label={t.area} htmlFor="req-area" error={errorNode("area")}>
          <Input
            {...fieldProps("area")}
            autoComplete="address-level3"
            placeholder={t.areaPlaceholder}
            defaultValue={v("area")}
            maxLength={100}
            required
          />
        </Field>
        <Field label={t.whatsapp} htmlFor="req-whatsapp_number" error={errorNode("whatsapp_number")}>
          <Input
            {...fieldProps("whatsapp_number")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder={t.whatsappPlaceholder}
            defaultValue={v("whatsapp_number")}
            maxLength={20}
            required
            className="text-start rtl:text-right"
          />
        </Field>
        <Field label={t.preferredTime} htmlFor="req-preferred_time" error={errorNode("preferred_time")}>
          <Select {...fieldProps("preferred_time")} defaultValue={v("preferred_time") || "anytime"}>
            {PREFERRED_TIMES.map((p) => (
              <option key={p} value={p}>
                {t.times[p]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {state.status === "error" && state.error && (
        <p role="alert" className="mt-4 rounded-xl bg-feedback-danger/5 px-4 py-3 text-sm text-feedback-danger">
          {t.errors[state.error]}
        </p>
      )}

      <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? t.submitting : t.submit}
      </Button>
      <p className="mt-3 text-center text-xs text-text-secondary">{t.privacy}</p>
    </form>
  );
}
