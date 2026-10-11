import { getShopContext, requireShopContext } from "@/lib/auth";
import { closesToday } from "@/lib/hours";
import { exitViewAs } from "@/app/actions/view-as";
import { ShopAvatar } from "@/components/ui/product-image";
import { PwaRegister } from "./pwa-register";
import { BottomNav, SidebarNav } from "./nav";
import { ShopOpenToggle } from "./shop-open-toggle";
import { OrdersRealtime } from "./orders-realtime";
import { ShopStatusNotice } from "./status-notice";

/**
 * Dashboard chrome: desktop left sidebar + mobile bottom nav + realtime order alerts.
 * If the signed-in user has no shop, children render bare (the /dashboard/no-shop page,
 * or pages that call requireShopContext() and redirect away).
 */
export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const initial = await getShopContext();
  if (!initial.shop) return <>{children}</>;
  // Applies the shop-level redirects (e.g. owners who must change a temporary password).
  const { supabase, shop, mode, role } = await requireShopContext();
  const isOwnerLevel = role !== "staff";

  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shop.id)
    .eq("status", "new");
  const newCount = count ?? 0;
  const closesAt = closesToday(shop.opening_hours);

  return (
    <div className="min-h-svh bg-surface-bg">
      {mode === "admin" && (
        <div
          role="status"
          className="relative z-50 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-brand-accent px-4 py-2.5 text-sm text-text-primary md:px-6 print:hidden"
        >
          <p className="min-w-0">
            <span className="font-bold">Super admin mode</span> — viewing{" "}
            <span className="font-semibold">{shop.name}</span> as the shopkeeper. Changes are logged.
          </p>
          <form action={exitViewAs}>
            <button
              type="submit"
              className="rounded-full bg-text-primary px-3.5 py-1.5 text-xs font-bold text-text-inverse hover:opacity-90"
            >
              Exit to admin
            </button>
          </form>
        </div>
      )}
      <div className="md:flex">
        <PwaRegister />
        <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border bg-surface-card px-4 py-5 md:flex print:hidden">
          <div className="flex items-center gap-3 px-1">
            <ShopAvatar name={shop.name} logoUrl={shop.logo_url} className="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{shop.name}</p>
              <p className="text-xs text-text-secondary">Dukaan dashboard</p>
            </div>
          </div>
          <SidebarNav newCount={newCount} ownerNav={isOwnerLevel} />
          {isOwnerLevel && (
            <div className="mt-auto">
              <ShopOpenToggle isOpen={shop.is_open} closesAt={closesAt} variant="sidebar" />
            </div>
          )}
        </aside>
        <div className="min-w-0 flex-1">
          <OrdersRealtime shopId={shop.id} newCount={newCount} />
          <ShopStatusNotice status={shop.status} paidUntil={shop.paid_until} />
          <div className="pb-24 md:pb-0 print:pb-0">{children}</div>
        </div>
        <BottomNav newCount={newCount} ownerNav={isOwnerLevel} />
      </div>
    </div>
  );
}

/** Lightweight placeholder while the shell streams in. */
export function DashboardShellSkeleton() {
  return (
    <div className="min-h-svh bg-surface-bg md:flex">
      <aside className="hidden h-svh w-60 shrink-0 border-r border-border bg-surface-card md:block" />
      <div className="flex-1 p-4 md:p-8">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-border/60" />
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-card bg-surface-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
