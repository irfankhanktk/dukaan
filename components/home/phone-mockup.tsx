import { MessageCircle, ShoppingBag } from "lucide-react";
import type { HomeStrings } from "@/lib/home-i18n";
import { cn } from "@/lib/utils";

const THUMBS = [
  "from-[#7B4A2D] to-[#3E2417]", // chocolate
  "from-[#E8B65C] to-[#B9772A]", // patties
  "from-[#C2562F] to-[#7A2E16]", // gulab jamun
];

/** Decorative HTML/CSS phone showing the demo shop page and an incoming WhatsApp order. */
export function PhoneMockup({ t, className }: { t: HomeStrings["demo"]; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("relative mx-auto w-[260px] select-none", className)}>
      <div className="rounded-[2.5rem] border-[10px] border-text-primary bg-text-primary shadow-2xl">
        <div className="relative overflow-hidden rounded-[1.9rem] bg-surface-bg">
          {/* notch */}
          <div className="absolute left-1/2 top-1.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-text-primary" />
          {/* shop header */}
          <div className="bg-brand-primary px-4 pb-4 pt-8 text-text-inverse">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-accent text-sm font-extrabold text-text-primary">
                AB
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold leading-tight">{t.shopName}</p>
                <p className="truncate text-[10px] text-text-inverse/75">{t.shopArea}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-1.5 text-[10px] font-semibold">
              <span className="rounded-full bg-white/15 px-2 py-0.5">{t.open}</span>
              <span className="rounded-full bg-white/15 px-2 py-0.5">{t.delivery}</span>
            </div>
          </div>
          {/* category chips */}
          <div className="flex gap-1.5 px-3 pt-3 text-[10px] font-semibold">
            {t.tabs.map((tab, i) => (
              <span
                key={tab}
                className={cn(
                  "rounded-full px-2.5 py-1",
                  i === 0
                    ? "bg-brand-primary text-text-inverse"
                    : "border border-border bg-surface-card text-text-secondary",
                )}
              >
                {tab}
              </span>
            ))}
          </div>
          {/* products */}
          <ul className="space-y-2 px-3 pb-16 pt-3">
            {t.products.map((p, i) => (
              <li
                key={p.name}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-card p-2"
              >
                <span className={cn("h-11 w-11 shrink-0 rounded-lg bg-gradient-to-br", THUMBS[i % THUMBS.length])} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-[11px] font-bold leading-tight" dir="ltr">
                    {p.name}
                  </span>
                  <span className="block text-[9px] text-text-secondary">{p.note}</span>
                  <span className="block text-[11px] font-bold text-brand-primary" dir="ltr">
                    {p.price}
                  </span>
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary-soft text-sm font-bold text-brand-primary">
                  +
                </span>
              </li>
            ))}
          </ul>
          {/* cart bar */}
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-xl bg-brand-primary py-2.5 text-[11px] font-bold text-text-inverse">
            <ShoppingBag className="h-3.5 w-3.5" />
            {t.cart}
          </div>
        </div>
      </div>
      {/* incoming WhatsApp order */}
      <div
        dir="ltr"
        className="absolute -right-6 top-24 w-48 rounded-2xl border border-border bg-surface-card p-3 text-left font-sans shadow-xl md:-right-16"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-whatsapp">
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </div>
        <p className="mt-1 text-[11px] font-bold leading-snug">{t.whatsappTitle}</p>
        <p className="text-[10px] leading-snug text-text-secondary">{t.whatsappBody}</p>
      </div>
    </div>
  );
}
