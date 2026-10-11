import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const WIZARD_STEPS = [
  { n: 1, label: "Shop details" },
  { n: 2, label: "Owner account" },
  { n: 3, label: "Delivery & hours" },
  { n: 4, label: "Menu & products" },
  { n: 5, label: "Review & go live" },
] as const;

/**
 * Header + 1–5 stepper for the register-shop wizard. Steps up to the shop's saved
 * onboarding_step are links (jump back and forth); later steps are disabled.
 */
export function WizardHeader({
  shopId,
  shopName,
  step,
  maxStep,
  isLive,
}: {
  shopId: string | null;
  shopName: string | null;
  step: number;
  maxStep: number;
  isLive?: boolean;
}) {
  const current = WIZARD_STEPS[step - 1];
  return (
    <header className="print:hidden">
      <Link
        href={shopId && isLive ? `/admin/shops/${shopId}` : "/admin/shops"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-brand-primary"
      >
        <ArrowLeft className="h-4 w-4" /> {shopId && isLive ? "Back to shop" : "All shops"}
      </Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold leading-tight md:text-[28px]">
          {shopName ? shopName : "Register new shop"}
        </h1>
        <p className="text-sm text-text-secondary">
          {shopId ? (isLive ? "Editing setup" : "Draft · saved after each step") : "Saved as a draft when you continue"}
        </p>
      </div>

      <ol className="mt-4 grid grid-cols-5 gap-1.5 md:gap-3" aria-label="Setup steps">
        {WIZARD_STEPS.map(({ n, label }) => {
          const done = n < maxStep || (isLive && n <= maxStep);
          const active = n === step;
          const reachable = n === 1 ? true : !!shopId && n <= maxStep;
          const href = shopId ? `/admin/shops/${shopId}/setup?step=${n}` : "/admin/shops/new";
          const inner = (
            <>
              <span
                className={cn(
                  "h-1.5 w-full rounded-full",
                  active ? "bg-brand-primary" : done ? "bg-brand-primary/60" : "bg-border",
                )}
              />
              <span className="mt-2 flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    active
                      ? "bg-brand-primary text-text-inverse"
                      : done
                        ? "bg-brand-primary-soft text-brand-primary"
                        : "bg-surface-card text-text-secondary ring-1 ring-border",
                  )}
                >
                  {done && !active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
                </span>
                <span
                  className={cn(
                    "hidden truncate text-[13px] md:inline",
                    active ? "font-semibold text-text-primary" : "text-text-secondary",
                  )}
                >
                  {label}
                </span>
              </span>
            </>
          );
          return (
            <li key={n}>
              {reachable && !active ? (
                <Link href={href} className="flex flex-col rounded-lg hover:opacity-80" aria-label={`Step ${n}: ${label}`}>
                  {inner}
                </Link>
              ) : (
                <div
                  className={cn("flex flex-col", !reachable && "opacity-60")}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Step ${n}: ${label}`}
                >
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm font-semibold md:hidden">
        Step {step} of 5 · {current?.label}
      </p>
    </header>
  );
}

/**
 * Save / Next bar. Sticky at the bottom on phones (above the admin bottom nav),
 * a normal right-aligned row on desktop.
 */
export function StickyBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-6 border-t border-border bg-surface-card/95 px-4 py-3 backdrop-blur",
        "md:static md:mx-0 md:mt-8 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
        className,
      )}
    >
      <div className="flex items-center gap-3 [&>*]:flex-1 md:justify-end md:[&>*]:flex-none">{children}</div>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-status-rejected-bg px-4 py-3 text-sm text-status-rejected-fg">
      {message}
    </p>
  );
}

export function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border border-border bg-surface-card p-4 md:p-6", className)}>
      <h2 className="text-base font-bold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-text-secondary">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
