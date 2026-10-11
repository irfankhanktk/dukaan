"use client";

import { Bike, Clock, Timer } from "lucide-react";
import { ShopAvatar } from "@/components/ui/product-image";
import { formatRs } from "@/lib/format";
import { closesToday, DAY_LABELS, formatClock, fullWeek, isWithinHours } from "@/lib/hours";
import { DAY_KEYS, type OpeningHours, type PublicShop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LanguageToggle, useLang } from "./language";

function Chip({ icon, children, tone = "default" }: {
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold [&_svg]:h-3.5 [&_svg]:w-3.5",
        tone === "success" && "bg-status-delivered-bg text-status-delivered-fg",
        tone === "danger" && "bg-status-rejected-bg text-status-rejected-fg",
        tone === "default" && "bg-surface-bg text-text-secondary",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Next opening time in Pakistan time: "9 AM" today, or "Tue 9 AM" on a later day. */
function nextOpening(hours: OpeningHours): string | null {
  if (!hours.days) return null;
  const week = fullWeek(hours);
  const pk = new Date(Date.now() + 5 * 3600_000);
  const todayIdx = (pk.getUTCDay() + 6) % 7;
  const nowMin = pk.getUTCHours() * 60 + pk.getUTCMinutes();
  for (let i = 0; i < 8; i++) {
    const key = DAY_KEYS[(todayIdx + i) % 7];
    const d = week[key];
    if (d.closed) continue;
    if (i === 0) {
      if (toMinutes(d.open) > nowMin) return formatClock(d.open);
      continue;
    }
    return `${DAY_LABELS[key].slice(0, 3)} ${formatClock(d.open)}`;
  }
  return null;
}

/** Colored cover band + avatar, name, area, info chips and the EN | اردو toggle. */
export function ShopHeader({ shop }: { shop: PublicShop }) {
  const { t } = useLang();
  // Schedule chips are informational; ordering is controlled by shop.is_open.
  const closeAt = closesToday(shop.opening_hours);
  const withinHours = isWithinHours(shop.opening_hours);
  const opensAt = withinHours === false ? nextOpening(shop.opening_hours) : null;
  const prep = shop.opening_hours?.prep_time;
  const areaFees = (shop.delivery_areas ?? []).map((a) => a.fee);
  const minFee = areaFees.length ? Math.min(...areaFees) : shop.delivery_fee;
  const maxFee = areaFees.length ? Math.max(...areaFees) : shop.delivery_fee;

  return (
    <header className="relative">
      <div
        className="h-24 w-full md:h-32"
        style={{ backgroundColor: shop.cover_color || "#0F5C4A" }}
      >
        <div className="mx-auto flex h-full max-w-7xl items-start justify-end px-4 pt-3 md:px-6">
          <LanguageToggle />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="-mt-8 flex items-end gap-3 md:-mt-10 md:gap-4">
          <ShopAvatar
            name={shop.name}
            logoUrl={shop.logo_url}
            className="h-16 w-16 rounded-2xl text-xl ring-4 ring-surface-bg md:h-20 md:w-20 md:text-2xl"
            priority
          />
        </div>
        <h1 className="mt-2 text-[22px] font-extrabold leading-tight md:text-[28px]" dir="auto">
          {shop.name}
        </h1>
        {shop.area && (
          <p className="mt-0.5 text-sm text-text-secondary" dir="auto">
            {shop.area}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {!shop.is_open ? (
            <Chip icon={<Clock />} tone="danger">
              {t("closedNow")}
            </Chip>
          ) : withinHours === false ? (
            <Chip icon={<Clock />} tone="default">
              <span suppressHydrationWarning>
                {opensAt ? t("closedOpensAt", { time: opensAt }) : t("closedNow")}
              </span>
            </Chip>
          ) : (
            <Chip icon={<Clock />} tone="success">
              <span suppressHydrationWarning>
                {closeAt ? t("openTill", { time: closeAt }) : t("openNow")}
              </span>
            </Chip>
          )}
          <Chip icon={<Bike />}>
            {maxFee <= 0
              ? t("freeDelivery")
              : minFee === maxFee
                ? t("deliveryFee", { amount: formatRs(minFee) })
                : t("deliveryFrom", { amount: formatRs(minFee) })}
          </Chip>
          {prep && <Chip icon={<Timer />}>{prep}</Chip>}
        </div>
      </div>
    </header>
  );
}
