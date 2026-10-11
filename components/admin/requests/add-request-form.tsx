"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { createManualRequest, type ManualRequestState } from "@/app/admin/requests/actions";
import { BUSINESS_TYPES, REQUEST_STATUSES } from "@/lib/types";
import { BUSINESS_TYPE_LABELS, PREFERRED_TIMES, PREFERRED_TIME_LABELS } from "@/lib/home-i18n";
import { MANUAL_SOURCES, REQUEST_SOURCE_LABELS, REQUEST_STATUS_LABELS } from "./labels";

const initial: ManualRequestState = { status: "idle" };

/** "Add request manually" — for leads that came via WhatsApp, in person or a referral. */
export function AddRequestForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createManualRequest, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  const err = (k: string) => state.fieldErrors?.[k];
  const inv = (k: string) => (err(k) ? true : undefined);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus aria-hidden /> Add request manually
      </Button>
    );
  }

  return (
    <div className="w-full rounded-card border border-border bg-surface-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Add request manually</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="rounded-full p-1.5 text-text-secondary hover:bg-surface-bg"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Owner name" htmlFor="mr-owner_name" error={err("owner_name")}>
          <Input id="mr-owner_name" name="owner_name" required maxLength={80} aria-invalid={inv("owner_name")} />
        </Field>
        <Field label="Shop name" htmlFor="mr-shop_name" error={err("shop_name")}>
          <Input id="mr-shop_name" name="shop_name" required maxLength={100} aria-invalid={inv("shop_name")} />
        </Field>
        <Field label="Business type" htmlFor="mr-business_type" error={err("business_type")}>
          <Select id="mr-business_type" name="business_type" defaultValue="" aria-invalid={inv("business_type")}>
            <option value="" disabled>
              Choose one
            </option>
            {BUSINESS_TYPES.map((b) => (
              <option key={b} value={b}>
                {BUSINESS_TYPE_LABELS.en[b]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="City" htmlFor="mr-city" error={err("city")}>
          <Input id="mr-city" name="city" maxLength={60} aria-invalid={inv("city")} />
        </Field>
        <Field label="Area" htmlFor="mr-area" error={err("area")}>
          <Input id="mr-area" name="area" maxLength={100} aria-invalid={inv("area")} />
        </Field>
        <Field label="WhatsApp number" htmlFor="mr-whatsapp_number" error={err("whatsapp_number")}>
          <Input
            id="mr-whatsapp_number"
            name="whatsapp_number"
            type="tel"
            inputMode="tel"
            placeholder="0300 1234567"
            required
            aria-invalid={inv("whatsapp_number")}
          />
        </Field>
        <Field label="Preferred time to call" htmlFor="mr-preferred_time" error={err("preferred_time")}>
          <Select id="mr-preferred_time" name="preferred_time" defaultValue="">
            <option value="">Not given</option>
            {PREFERRED_TIMES.map((p) => (
              <option key={p} value={p}>
                {PREFERRED_TIME_LABELS[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source" htmlFor="mr-source" error={err("source")}>
          <Select id="mr-source" name="source" defaultValue="whatsapp">
            {MANUAL_SOURCES.map((s) => (
              <option key={s} value={s}>
                {REQUEST_SOURCE_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="mr-status" error={err("status")}>
          <Select id="mr-status" name="status" defaultValue="new">
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REQUEST_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Follow-up date" htmlFor="mr-follow_up_at" error={err("follow_up_at")}>
          <Input id="mr-follow_up_at" name="follow_up_at" type="date" />
        </Field>
        <Field label="Notes" htmlFor="mr-notes" error={err("notes")} className="sm:col-span-2">
          <Textarea id="mr-notes" name="notes" maxLength={4000} rows={2} />
        </Field>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Save request
          </Button>
          {state.message && (
            <p
              role={state.status === "error" ? "alert" : "status"}
              className={state.status === "error" ? "text-sm text-feedback-danger" : "text-sm text-brand-whatsapp"}
            >
              {state.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
