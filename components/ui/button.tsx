import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand-primary text-text-inverse hover:bg-brand-primary/90",
        secondary:
          "border border-border bg-surface-card text-brand-primary hover:bg-brand-primary-soft",
        whatsapp: "bg-brand-whatsapp text-text-inverse hover:bg-brand-whatsapp/90",
        danger:
          "border border-feedback-danger/30 bg-surface-card text-feedback-danger hover:bg-feedback-danger/5",
        ghost: "text-text-primary hover:bg-brand-primary-soft",
        link: "text-brand-primary underline-offset-4 hover:underline",
        // Aliases kept for the template auth forms
        default: "bg-brand-primary text-text-inverse hover:bg-brand-primary/90",
        outline:
          "border border-border bg-surface-card text-brand-primary hover:bg-brand-primary-soft",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-xs",
        lg: "h-14 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
