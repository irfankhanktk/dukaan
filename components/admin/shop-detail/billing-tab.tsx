import { createClient } from "@/lib/supabase/server";
import { formatRs } from "@/lib/format";
import type { Shop, SubscriptionPayment } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { BillingSettingsForm, RecordPaymentForm } from "./billing-forms";
import { StatusActionButton } from "./status-action-button";
import { resolveActors } from "./server-utils";
import {
  PAYMENT_METHOD_LABELS,
  SHOP_STATUS_LABELS,
  SHOP_STATUS_VARIANT,
  addDays,
  formatDateTime,
  formatDay,
  pkToday,
} from "./shared";

export async function BillingTab({ shop }: { shop: Shop }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_payments")
    .select("*")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<SubscriptionPayment[]>();
  const payments = data ?? [];
  const recorders = await resolveActors(payments.map((p) => p.recorded_by));

  const today = pkToday();
  const defaultStart = shop.paid_until ? addDays(shop.paid_until, 1) : today;
  const overdue = !!shop.paid_until && shop.paid_until < today;

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="rounded-card border border-border bg-surface-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold">Subscription</h2>
            <Badge variant={SHOP_STATUS_VARIANT[shop.status]}>{SHOP_STATUS_LABELS[shop.status]}</Badge>
            {overdue && <Badge variant="new">Paid until date has passed</Badge>}
          </div>
          {(shop.status === "active" || shop.status === "trial") && (
            <StatusActionButton
              shopId={shop.id}
              status="payment_due"
              label="Mark payment due"
              size="sm"
              confirmText={`Mark ${shop.name} as payment due? The shop keeps taking orders.`}
            />
          )}
        </div>
        <div className="mt-4">
          <BillingSettingsForm
            key={`${shop.plan}-${shop.monthly_fee}-${shop.paid_until}`}
            shopId={shop.id}
            plan={shop.plan}
            monthlyFee={shop.monthly_fee}
            paidUntil={shop.paid_until}
          />
        </div>
      </section>

      <section id="record-payment" className="scroll-mt-20 rounded-card border border-border bg-surface-card p-4 md:p-5">
        <h2 className="font-bold">Record payment</h2>
        <p className="mb-4 mt-1 text-sm text-text-secondary">
          Extends &ldquo;paid until&rdquo; to the end of the period
          {shop.status === "payment_due" ? " and sets the shop back to Active" : ""}.
        </p>
        <RecordPaymentForm key={defaultStart} shopId={shop.id} defaultAmount={shop.monthly_fee} defaultStart={defaultStart} />
      </section>

      <section className="overflow-hidden rounded-card border border-border bg-surface-card">
        <h2 className="border-b border-border px-4 py-3 font-bold md:px-5">Payments</h2>
        {error && <p className="px-4 py-3 text-sm text-feedback-danger">Couldn&apos;t load payments: {error.message}</p>}
        {payments.length === 0 && !error ? (
          <p className="px-4 py-8 text-center text-sm text-text-secondary">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface-bg text-xs text-text-secondary">
                <tr>
                  <th className="px-4 py-2 font-medium md:px-5">Date</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium">Recorded by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => {
                  const by = p.recorded_by ? recorders.get(p.recorded_by) : null;
                  return (
                    <tr key={p.id} className="align-top">
                      <td className="px-4 py-2.5 md:px-5">{formatDateTime(p.created_at)}</td>
                      <td className="px-3 py-2.5 font-semibold">{formatRs(p.amount)}</td>
                      <td className="px-3 py-2.5">{PAYMENT_METHOD_LABELS[p.method]}</td>
                      <td className="px-3 py-2.5">
                        {formatDay(p.period_start)} – {formatDay(p.period_end)}
                        {p.note && <span className="block text-xs text-text-secondary">{p.note}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">{by?.name ?? by?.contact ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
