"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "./language";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet on mobile, centered modal on desktop (≥ md).
 * Closes on Escape and backdrop click, traps Tab focus, restores focus on close.
 */
export function Sheet({
  open,
  onClose,
  labelledBy,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const { t, dir, lang } = useLang();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6"
      dir={dir}
      lang={lang}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-black/45 animate-in fade-in-0"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[24px] bg-surface-card shadow-2xl outline-none animate-in slide-in-from-bottom-8 md:max-h-[88vh] md:max-w-[560px] md:rounded-card md:slide-in-from-bottom-0 md:zoom-in-95",
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-border md:hidden" aria-hidden />
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface-card/90 text-text-primary shadow-sm ring-1 ring-border hover:bg-brand-primary-soft"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-border bg-surface-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
