import { CircleAlert, Info, OctagonX } from "lucide-react";
import type { ShopStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatPaidUntil(date: string): string {
  // paid_until is a plain date ("2026-10-31"); format without timezone shifts.
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(d);
}

/**
 * Read-only notice about the shop's platform status (set by Dukaan, not the owner).
 * trial/active show nothing.
 */
export function ShopStatusNotice({ status, paidUntil }: { status: ShopStatus; paidUntil: string | null }) {
  let tone: "danger" | "info" | "warning";
  let title: string;
  let body: string | null = null;

  if (status === "suspended") {
    tone = "danger";
    title = "Your shop is suspended and not taking orders. Contact Dukaan support.";
    body = "Customers see “This shop is not taking orders right now”. You can still view your orders and menu.";
  } else if (status === "setup") {
    tone = "info";
    title = "Your shop is being set up and isn't public yet";
    body = "Customers can't open your shop link until Dukaan puts it live.";
  } else if (status === "payment_due") {
    tone = "warning";
    title = "Subscription payment is due";
    body = paidUntil ? `Paid until ${formatPaidUntil(paidUntil)}. Please contact Dukaan to renew.` : "Please contact Dukaan to renew.";
  } else {
    return null;
  }

  const Icon = tone === "danger" ? OctagonX : tone === "warning" ? CircleAlert : Info;

  return (
    <div className="px-4 pt-4 md:px-8 md:pt-6 print:hidden">
      <div
        role={tone === "danger" ? "alert" : "status"}
        className={cn(
          "mx-auto flex max-w-[1280px] items-start gap-3 rounded-card border px-4 py-3",
          tone === "danger" && "border-feedback-danger bg-status-rejected-bg text-status-rejected-fg",
          tone === "warning" && "border-brand-accent bg-brand-accent-soft text-status-new-fg",
          tone === "info" && "border-status-preparing-fg/30 bg-status-preparing-bg text-status-preparing-fg",
        )}
      >
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className={cn("text-sm font-bold", tone === "danger" && "text-[15px]")}>{title}</p>
          {body && <p className="mt-0.5 text-xs opacity-90 md:text-sm">{body}</p>}
        </div>
      </div>
    </div>
  );
}
