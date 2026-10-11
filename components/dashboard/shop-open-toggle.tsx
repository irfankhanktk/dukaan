"use client";

import { useOptimistic, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setShopOpen } from "@/app/dashboard/actions";

/** "Taking orders" switch — updates shops.is_open via a Server Action. */
export function ShopOpenToggle({
  isOpen,
  closesAt,
  variant = "sidebar",
}: {
  isOpen: boolean;
  closesAt: string | null;
  variant?: "sidebar" | "card";
}) {
  const [optimisticOpen, setOptimisticOpen] = useOptimistic(isOpen);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    const next = !optimisticOpen;
    setError(null);
    startTransition(async () => {
      setOptimisticOpen(next);
      const res = await setShopOpen(next);
      if (!res.ok) setError(res.error);
    });
  };

  const sub = optimisticOpen
    ? variant === "card"
      ? `Shop is open${closesAt ? ` · closes ${closesAt}` : ""}`
      : closesAt
        ? `Closes ${closesAt}`
        : "Shop is open"
    : "Shop is closed — customers can't order";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        variant === "sidebar"
          ? "rounded-card bg-brand-primary-soft px-3 py-3"
          : "rounded-card border border-border bg-surface-card px-4 py-3.5",
      )}
    >
      <div className="min-w-0">
        <p className={cn("font-bold", variant === "sidebar" ? "text-sm" : "text-[15px]")}>
          {optimisticOpen ? "Taking orders" : "Not taking orders"}
        </p>
        <p className="text-xs text-text-secondary">{error ?? sub}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={optimisticOpen}
        aria-label="Taking orders"
        disabled={pending}
        onClick={toggle}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-70",
          optimisticOpen ? "bg-brand-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-surface-card shadow transition-all",
            optimisticOpen ? "left-6" : "left-1",
          )}
        />
      </button>
    </div>
  );
}
