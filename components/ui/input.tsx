import * as React from "react";

import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-border bg-surface-card px-4 text-[15px] text-text-primary placeholder:text-text-secondary/70 focus-visible:outline-none focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary/15 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-feedback-danger";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input type={type} className={cn(fieldClass, "h-12", className)} ref={ref} {...props} />
  ),
);
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea className={cn(fieldClass, "min-h-[88px] py-3", className)} ref={ref} {...props} />
  ),
);
Textarea.displayName = "Textarea";

const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => (
    <select className={cn(fieldClass, "h-12 pr-10", className)} ref={ref} {...props} />
  ),
);
Select.displayName = "Select";

/** Label + control + optional hint/error, as in the Figma "Input field" component. */
function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-text-secondary">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-feedback-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-secondary">{hint}</p>
      ) : null}
    </div>
  );
}

export { Input, Textarea, Select, Field };
