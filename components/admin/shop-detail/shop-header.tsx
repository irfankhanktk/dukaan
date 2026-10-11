import Link from "next/link";
import { ArrowLeft, ExternalLink, Wrench } from "lucide-react";
import type { Shop } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopAvatar } from "@/components/ui/product-image";
import { cn } from "@/lib/utils";
import { ViewAsButton } from "./view-as-button";
import { SHOP_STATUS_LABELS, SHOP_STATUS_VARIANT, SHOP_TABS, SHOP_TAB_LABELS, shopTabHref, type ShopTab } from "./shared";

export function ShopHeader({ shop }: { shop: Shop }) {
  return (
    <header>
      <Link
        href="/admin/shops"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-brand-primary"
      >
        <ArrowLeft className="h-4 w-4" /> All shops
      </Link>
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <ShopAvatar name={shop.name} logoUrl={shop.logo_url} className="h-14 w-14" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold md:text-[26px]">{shop.name}</h1>
              <Badge variant={SHOP_STATUS_VARIANT[shop.status]}>{SHOP_STATUS_LABELS[shop.status]}</Badge>
            </div>
            <p className="truncate text-sm text-text-secondary">
              /{shop.slug}
              {shop.area || shop.city ? ` · ${[shop.area, shop.city].filter(Boolean).join(", ")}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {shop.status === "setup" && (
            <Button asChild size="sm">
              <Link href={`/admin/shops/${shop.id}/setup?step=${shop.onboarding_step}`}>
                <Wrench /> Continue setup
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary" size="sm">
            <a href={`/${shop.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> Open shop page
            </a>
          </Button>
          <ViewAsButton shopId={shop.id} size="sm" />
        </div>
      </div>
      {shop.status === "suspended" && (
        <p className="mt-4 rounded-xl bg-status-rejected-bg px-4 py-3 text-sm text-status-rejected-fg">
          Suspended — customers see &ldquo;This shop is not taking orders right now&rdquo;.
        </p>
      )}
    </header>
  );
}

/** Underlined tabs on desktop; a horizontally scrollable chip row on mobile. */
export function ShopTabs({ shopId, active }: { shopId: string; active: ShopTab }) {
  return (
    <nav
      aria-label="Shop sections"
      className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:gap-6 md:border-b md:border-border md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden"
    >
      {SHOP_TABS.map((t) => (
        <Link
          key={t}
          href={shopTabHref(shopId, t)}
          scroll={false}
          aria-current={t === active ? "page" : undefined}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            "md:-mb-px md:rounded-none md:border-0 md:border-b-2 md:bg-transparent md:px-0 md:pb-3 md:pt-1",
            t === active
              ? "border-brand-primary bg-brand-primary text-text-inverse md:border-brand-primary md:text-brand-primary"
              : "border-border bg-surface-card text-text-primary hover:bg-brand-primary-soft md:border-transparent md:text-text-secondary md:hover:bg-transparent md:hover:text-text-primary",
          )}
        >
          {SHOP_TAB_LABELS[t]}
        </Link>
      ))}
    </nav>
  );
}
