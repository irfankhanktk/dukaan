"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartColumn, List, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Orders", icon: List },
  { href: "/dashboard/menu", label: "Menu", icon: BookOpen },
  { href: "/dashboard/sales", label: "Sales", icon: ChartColumn },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

/** Staff only see Orders; menu, sales and settings are owner-level. */
function navItems(ownerNav: boolean) {
  return ownerNav ? ITEMS : ITEMS.filter((i) => i.href === "/dashboard");
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/orders");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop sidebar navigation (Figma 8:181). */
export function SidebarNav({ newCount, ownerNav = true }: { newCount: number; ownerNav?: boolean }) {
  const pathname = usePathname();
  const items = navItems(ownerNav);
  return (
    <nav className="mt-6 flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors",
              active
                ? "bg-brand-primary-soft font-semibold text-brand-primary"
                : "text-text-primary hover:bg-brand-primary-soft/60",
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="flex-1">{label}</span>
            {href === "/dashboard" && newCount > 0 && (
              <span className="min-w-[22px] rounded-full bg-feedback-danger px-1.5 text-center text-xs font-bold leading-5 text-text-inverse">
                {newCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile bottom navigation (Figma 5:110). Hidden on the full-screen order details page. */
export function BottomNav({ newCount, ownerNav = true }: { newCount: number; ownerNav?: boolean }) {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard/orders/")) return null;
  const items = navItems(ownerNav);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-card pb-[env(safe-area-inset-bottom)] md:hidden print:hidden">
      <ul className={cn("grid", items.length === 4 ? "grid-cols-4" : "grid-cols-1")}>
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 pb-2.5 pt-3 text-xs",
                  active ? "font-semibold text-brand-primary" : "text-text-secondary",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                  {href === "/dashboard" && newCount > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-feedback-danger px-1 text-center text-[10px] font-bold leading-[18px] text-text-inverse">
                      {newCount}
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
  );
}
