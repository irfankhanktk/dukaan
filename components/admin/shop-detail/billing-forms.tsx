"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { recordPaymentAction, updateBillingAction } from "@/app/admin/shops/[id]/actions";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, periodEndFor } from "./shared";

export function BillingSettingsForm({
  shopId,
  plan,
  monthlyFee,
  paidUntil,
}: {
  shopId: string;
  plan: string;
  monthlyFee: number;
  paidUntil: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    start(async () => {
      const res = await updateBillingAction({
        shopId,
        plan: String(fd.get("plan") ?? ""),
        monthlyFee: String(fd.get("monthlyFee") ?? "0"),
        paidUntil: String(fd.get("paidUntil") ?? ""),
      });
      setMsg(res.ok ? { ok: true, text: "Saved" } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
      <Field label="Plan" htmlFor="plan">
        <Input id="plan" name="plan" defaultValue={plan} required maxLength={40} />
      </Field>
      <Field label="Monthly fee (Rs)" htmlFor="monthlyFee">
        <Input id="monthlyFee" name="monthlyFee" type="number" min={0} step={1} defaultValue={monthlyFee} required />
      </Field>
      <Field label="Paid until" htmlFor="paidUntil">
        <Input id="paidUntil" name="paidUntil" type="date" defaultValue={paidUntil ?? ""} />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save billing settings"}
        </Button>
        {msg && (
          <p className={msg.ok ? "text-sm text-brand-primary" : "text-sm text-feedback-danger"}>{msg.text}</p>
        )}
      </div>
    </form>
  );
}

export function RecordPaymentForm({
  shopId,
  defaultAmount,
  defaultStart,
}: {
  shopId: string;
  defaultAmount: number;
  defaultStart: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd, setPeriodEnd] = useState(periodEndFor(defaultStart));
  const [endTouched, setEndTouched] = useState(false);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setMsg(null);
    start(async () => {
      const res = await recordPaymentAction({
        shopId,
        amount: String(fd.get("amount") ?? ""),
        method: String(fd.get("method") ?? "cash") as (typeof PAYMENT_METHODS)[number],
        periodStart,
        periodEnd,
        note: String(fd.get("note") ?? ""),
      });
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
        return;
      }
      setMsg({ ok: true, text: "Payment recorded" });
      form.reset();
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Amount (Rs)" htmlFor="amount">
        <Input
          id="amount"
          name="amount"
          type="number"
          min={1}
          step={1}
          defaultValue={defaultAmount > 0 ? defaultAmount : undefined}
          required
        />
      </Field>
      <Field label="Method" htmlFor="method">
        <Select id="method" name="method" defaultValue="cash">
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Period start" htmlFor="periodStart">
        <Input
          id="periodStart"
          type="date"
          required
          value={periodStart}
          onChange={(e) => {
            const v = e.target.value;
            setPeriodStart(v);
            if (!endTouched && /^\d{4}-\d{2}-\d{2}$/.test(v)) setPeriodEnd(periodEndFor(v));
          }}
        />
      </Field>
      <Field label="Period end" htmlFor="periodEnd">
        <Input
          id="periodEnd"
          type="date"
          required
          min={periodStart}
          value={periodEnd}
          onChange={(e) => {
            setEndTouched(true);
            setPeriodEnd(e.target.value);
          }}
        />
      </Field>
      <Field label="Note (optional)" htmlFor="note" className="sm:col-span-2">
        <Input id="note" name="note" maxLength={300} placeholder="e.g. Received by Bilal at the shop" />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Record payment"}
        </Button>
        {msg && (
          <p className={msg.ok ? "text-sm text-brand-primary" : "text-sm text-feedback-danger"}>{msg.text}</p>
        )}
      </div>
    </form>
  );
}
