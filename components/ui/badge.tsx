import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        new: "bg-status-new-bg text-status-new-fg",
        preparing: "bg-status-preparing-bg text-status-preparing-fg",
        out_for_delivery: "bg-status-out-bg text-status-out-fg",
        delivered: "bg-status-delivered-bg text-status-delivered-fg",
        rejected: "bg-status-rejected-bg text-status-rejected-fg",
        unconfirmed: "bg-status-unconfirmed-bg text-status-unconfirmed-fg",
        brand: "bg-brand-primary-soft text-brand-primary",
        accent: "bg-brand-accent-soft text-status-new-fg",
        danger: "bg-feedback-danger text-text-inverse",
      },
    },
    defaultVariants: { variant: "brand" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/**
 * Status badge for an order. A "new" order the shopkeeper has not confirmed
 * (the customer may never have pressed Send on WhatsApp) shows as "Unconfirmed".
 */
function StatusBadge({
  status,
  whatsappConfirmed = true,
  className,
}: {
  status: OrderStatus;
  whatsappConfirmed?: boolean;
  className?: string;
}) {
  if (status === "new" && !whatsappConfirmed) {
    return (
      <Badge variant="unconfirmed" className={className}>
        Unconfirmed
      </Badge>
    );
  }
  return (
    <Badge variant={status} className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export { Badge, StatusBadge, badgeVariants };
