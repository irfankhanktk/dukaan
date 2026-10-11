import { Card } from "@/components/ui/card";
import type { ShopStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ShopStatus, string> = {
  setup: "Being set up",
  trial: "Free trial",
  active: "Active",
  payment_due: "Payment due",
  suspended: "Suspended",
};

const STATUS_CLASS: Record<ShopStatus, string> = {
  setup: "bg-status-preparing-bg text-status-preparing-fg",
  trial: "bg-status-new-bg text-status-new-fg",
  active: "bg-status-delivered-bg text-status-delivered-fg",
  payment_due: "bg-brand-accent-soft text-status-new-fg",
  suspended: "bg-status-rejected-bg text-status-rejected-fg",
};

function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** Read-only: status, plan and billing are managed by Dukaan (super admin). */
export function SubscriptionCard({
  status,
  plan,
  paidUntil,
}: {
  status: ShopStatus;
  plan: string;
  paidUntil: string | null;
}) {
  return (
    <Card className="p-4 md:p-6">
      <h2 className="text-[15px] font-bold text-text-primary">Subscription</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">Status</dt>
          <dd>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_CLASS[status])}>
              {STATUS_LABEL[status] ?? status}
            </span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">Plan</dt>
          <dd className="font-medium capitalize text-text-primary">{plan}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">Paid until</dt>
          <dd className="font-medium text-text-primary">{paidUntil ? formatDay(paidUntil) : "—"}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-text-secondary">To change your plan or pay, contact Dukaan support.</p>
    </Card>
  );
}
