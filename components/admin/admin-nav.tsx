"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Store, Inbox, ScrollText, ShieldCheck, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin/shops", label: "Shops", icon: Store },
  { href: "/admin/requests", label: "Requests", icon: Inbox },
  { href: "/admin/activity", label: "Activity", icon: ScrollText },
  { href: "/admin/security", label: "Security", icon: ShieldCheck },
] as const;

/**
 * Admin navigation: brand-primary sidebar on desktop (distinct from the white shopkeeper
 * sidebar), bottom bar on mobile. The Requests badge updates live via Realtime.
 */
export function AdminNav({
  email,
  name,
  newRequests,
  mfaEnrolled,
}: {
  email: string;
  name: string | null;
  newRequests: number;
  mfaEnrolled: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();


  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-shop-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_requests" }, () => {
        router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/auth/login");
  };

  const badge = (n: number) =>
    n > 0 ? (
      <span className="ms-auto min-w-[20px] rounded-full bg-brand-accent px-1.5 text-center text-[11px] font-bold leading-5 text-text-primary">
        {n}
      </span>
    ) : null;

  return (
    <>
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col bg-brand-primary p-4 text-text-inverse md:flex print:hidden">
        <Link href="/admin/shops" className="px-2 py-1">
          <p className="text-lg font-extrabold">Dukaan</p>
          <p className="text-xs text-text-inverse/70">Super admin</p>
        </Link>
        <nav className="mt-6 flex flex-col gap-1">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                  active ? "bg-white/15" : "text-text-inverse/80 hover:bg-white/10",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {label}
                {href === "/admin/requests" && badge(newRequests)}
              </Link>
            );
          })}
        </nav>
        {!mfaEnrolled && (
          <Link
            href="/admin/security"
            className="mt-6 rounded-xl bg-brand-accent-soft p-3 text-xs text-status-new-fg"
          >
            <strong className="block">Turn on two-step verification</strong>
            Protect access to all shops with an authenticator app.
          </Link>
        )}
        <div className="mt-auto border-t border-white/15 pt-4">
          <p className="truncate text-sm font-semibold">{name ?? "Super admin"}</p>
          <p className="truncate text-xs text-text-inverse/70">{email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-xs text-text-inverse/80 hover:text-text-inverse"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile: green top bar + bottom nav */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-brand-primary px-4 py-3 text-text-inverse md:hidden print:hidden">
        <p className="font-extrabold">
          Dukaan <span className="text-xs font-medium text-text-inverse/70">Super admin</span>
        </p>
        <button type="button" onClick={logout} aria-label="Log out">
          <LogOut className="h-5 w-5" />
        </button>
      </header>
      {!mfaEnrolled && (
        <Link
          href="/admin/security"
          className="block bg-brand-accent-soft px-4 py-2 text-xs font-medium text-status-new-fg md:hidden"
        >
          Turn on two-step verification →
        </Link>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-brand-primary pb-[env(safe-area-inset-bottom)] md:hidden print:hidden">
        <ul className="grid grid-cols-4">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 pb-2.5 pt-3 text-xs text-text-inverse",
                    active ? "font-semibold" : "text-text-inverse/70",
                  )}
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                    {href === "/admin/requests" && newRequests > 0 && (
                      <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-brand-accent px-1 text-center text-[10px] font-bold leading-[18px] text-text-primary">
                        {newRequests}
                      </span>
                    )}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
