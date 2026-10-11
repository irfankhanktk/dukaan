"use client";

import { useSyncExternalStore } from "react";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAlertPrefs, getServerAlertPrefs, setSoundAlerts, subscribeAlertPrefs } from "./alerts";

/** Bell button in the orders header: toggles new-order sound alerts; dot = orders waiting. */
export function SoundBell({ hasNew, className }: { hasNew?: boolean; className?: string }) {
  const { sound } = useSyncExternalStore(subscribeAlertPrefs, getAlertPrefs, getServerAlertPrefs);
  const label = sound ? "Sound alerts on — tap to turn off" : "Turn on sound alerts";
  return (
    <button
      type="button"
      onClick={() => setSoundAlerts(!sound)}
      aria-label={label}
      title={label}
      aria-pressed={sound}
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-card text-text-primary transition-colors hover:bg-brand-primary-soft print:hidden",
        className,
      )}
    >
      {sound ? <Bell className="h-[18px] w-[18px]" /> : <BellOff className="h-[18px] w-[18px] text-text-secondary" />}
      {hasNew && (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-feedback-danger ring-2 ring-surface-card" />
      )}
    </button>
  );
}
