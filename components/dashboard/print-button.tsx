"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrintButton({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size={iconOnly ? "icon" : "default"}
      onClick={() => window.print()}
      className={cn("print:hidden", iconOnly && "rounded-full", className)}
      aria-label="Print receipt"
    >
      {iconOnly ? <Printer /> : "Print receipt"}
    </Button>
  );
}
