"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";
import { setShopStatus } from "@/app/admin/shops/[id]/actions";

/** Suspend / reactivate / mark payment due, with a confirm step. */
export function StatusActionButton({
  shopId,
  status,
  label,
  confirmText,
  variant = "secondary",
  size,
  className,
}: {
  shopId: string;
  status: "active" | "suspended" | "payment_due";
  label: string;
  confirmText: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    if (!window.confirm(confirmText)) return;
    setError(null);
    start(async () => {
      const res = await setShopStatus({ shopId, status });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className={className}>
      <Button type="button" variant={variant} size={size} onClick={run} disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
      {error && <p className="mt-2 text-xs text-feedback-danger">{error}</p>}
    </div>
  );
}
