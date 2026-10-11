"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BellRing, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRs } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  dismissSoundPrompt,
  getAlertPrefs,
  getServerAlertPrefs,
  playAlert,
  setSoundAlerts,
  subscribeAlertPrefs,
  unlockAudio,
} from "./alerts";

type NewOrderToast = { id: string; orderNumber: number; name: string; total: number };

type OrderRow = {
  id: string;
  order_number: number;
  customer_name: string;
  total: number;
};

/**
 * Lives in the dashboard layout so alerts work on every dashboard page.
 * - Subscribes to Supabase Realtime INSERT/UPDATE on this shop's orders (RLS applies).
 * - INSERT: beep (if enabled), toast "New order #1043", optional system notification, router.refresh().
 * - UPDATE: router.refresh() so lists/counters stay in sync across devices.
 * - Keeps "(3) …" in the tab title for waiting new orders.
 */
export function OrdersRealtime({ shopId, newCount }: { shopId: string; newCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const prefs = useSyncExternalStore(subscribeAlertPrefs, getAlertPrefs, getServerAlertPrefs);
  const [toasts, setToasts] = useState<NewOrderToast[]>([]);
  const soundRef = useRef(prefs.sound);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    soundRef.current = prefs.sound;
  }, [prefs.sound]);

  // Unlock audio on the first tap/keypress of this visit (autoplay policy).
  useEffect(() => {
    if (!prefs.sound) return;
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [prefs.sound]);

  // Realtime subscription.
  useEffect(() => {
    const supabase = createClient();

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 300);
    };

    const channel = supabase
      .channel(`orders:${shopId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `shop_id=eq.${shopId}` },
        (payload) => {
          const row = payload.new as OrderRow;
          if (soundRef.current) playAlert();
          setToasts((t) => [
            ...t.filter((x) => x.id !== row.id),
            { id: row.id, orderNumber: row.order_number, name: row.customer_name, total: row.total },
          ]);
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.visibilityState === "hidden"
          ) {
            try {
              new Notification(`New order #${row.order_number}`, {
                body: `${row.customer_name} · ${formatRs(row.total)}`,
                tag: `order-${row.id}`,
              });
            } catch {
              // Some mobile browsers only allow notifications via the service worker.
            }
          }
          scheduleRefresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `shop_id=eq.${shopId}` },
        () => scheduleRefresh(),
      )
      .subscribe();

    // Catch up on anything missed while the phone was asleep / tab in background.
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [shopId, router]);

  // Keep "2 min ago" labels fresh on the orders screen.
  useEffect(() => {
    if (pathname !== "/dashboard") return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60_000);
    return () => clearInterval(id);
  }, [pathname, router]);

  // Tab title count.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = newCount > 0 ? `(${newCount}) ${base}` : base;
  }, [newCount, pathname]);

  // Auto-dismiss toasts.
  useEffect(() => {
    if (!toasts.length) return;
    const id = setTimeout(() => setToasts((t) => t.slice(1)), 10_000);
    return () => clearTimeout(id);
  }, [toasts]);

  const showPrompt = !prefs.sound && !prefs.promptDismissed;

  return (
    <>
      {showPrompt && (
        <div className="flex items-center gap-3 border-b border-border bg-brand-accent-soft px-4 py-2.5 text-sm print:hidden">
          <BellRing className="h-4 w-4 shrink-0 text-status-new-fg" />
          <p className="flex-1 text-status-new-fg">Get a sound alert when a new order arrives.</p>
          <Button size="sm" onClick={() => setSoundAlerts(true)}>
            Enable sound alerts
          </Button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismissSoundPrompt}
            className="rounded-full p-1 text-status-new-fg hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4 print:hidden"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-card bg-brand-primary px-4 py-3 text-text-inverse shadow-lg animate-in fade-in slide-in-from-top-2"
          >
            <BellRing className="h-5 w-5 shrink-0 text-brand-accent" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">New order #{t.orderNumber}</p>
              <p className="truncate text-xs text-text-inverse/80">
                {t.name} · {formatRs(t.total)}
              </p>
            </div>
            <Link
              href={`/dashboard/orders/${t.id}`}
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              className="rounded-btn bg-text-inverse px-3 py-1.5 text-xs font-semibold text-brand-primary md:hidden"
            >
              View
            </Link>
            <Link
              href={`/dashboard?order=${t.id}`}
              scroll={false}
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              className="hidden rounded-btn bg-text-inverse px-3 py-1.5 text-xs font-semibold text-brand-primary md:inline-block"
            >
              View
            </Link>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              className="rounded-full p-1 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
