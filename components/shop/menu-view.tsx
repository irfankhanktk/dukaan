"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Search, ShoppingBag, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProductCard } from "@/components/ui/product-card";
import { formatRs } from "@/lib/format";
import type { CartLine, Category, ProductWithOptions, PublicShop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCart } from "./cart";
import { CartLines } from "./cart-lines";
import { useLang } from "./language";
import { OptionsSheet } from "./options-sheet";
import { defaultQty, displayPrice, hasOptions, lineKey, unitKey } from "./pricing";
import { ShopHeader } from "./shop-header";

const OTHER = "__other";

type Section = { id: string; name: string; products: ProductWithOptions[] };

export function MenuView({
  shop,
  categories,
  products,
}: {
  shop: PublicShop;
  categories: Category[];
  products: ProductWithOptions[];
}) {
  const { t } = useLang();
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("all");
  const [openProduct, setOpenProduct] = useState<ProductWithOptions | null>(null);
  const [announce, setAnnounce] = useState("");

  const sections = useMemo<Section[]>(() => {
    const known = new Set(categories.map((c) => c.id));
    const list: Section[] = categories.map((c) => ({
      id: c.id,
      name: c.name,
      products: products.filter((p) => p.category_id === c.id),
    }));
    const rest = products.filter((p) => !p.category_id || !known.has(p.category_id));
    if (rest.length) list.push({ id: OTHER, name: t("other"), products: rest });
    return list.filter((s) => s.products.length > 0);
  }, [categories, products, t]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    return sections
      .filter((s) => q || active === "all" || s.id === active)
      .map((s) => ({
        ...s,
        products: q
          ? s.products.filter(
              (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.description ?? "").toLowerCase().includes(q),
            )
          : s.products,
      }))
      .filter((s) => s.products.length > 0);
  }, [sections, active, q]);

  const addLine = (line: CartLine) => {
    cart.add(line);
    setAnnounce(t("added", { name: line.name }));
  };

  const onProduct = (p: ProductWithOptions) => {
    if (!p.is_available) return;
    if (hasOptions(p)) {
      setOpenProduct(p);
      return;
    }
    addLine({
      key: lineKey(p.id, [], []),
      product_id: p.id,
      name: p.name,
      quantity: defaultQty(p.qty_step),
      unit: p.unit,
      qty_step: p.qty_step,
      unit_price: p.base_price,
      option_value_ids: [],
      texts: [],
      options: [],
      photo_url: p.photo_url,
    });
  };

  const checkoutHref = `/${shop.slug}/checkout`;
  const showBar = cart.hydrated && cart.lines.length > 0;
  const itemsLabel = cart.count === 1 ? t("item") : t("items", { n: cart.count });

  const chips = [{ id: "all", name: t("all") }, ...sections.map((s) => ({ id: s.id, name: s.name }))];

  return (
    <>
      <ShopHeader shop={shop} />

      {!shop.is_open && (
        <div className="mx-auto mt-4 max-w-7xl px-4 md:px-6">
          <div
            role="status"
            className="flex items-start gap-2 rounded-card border border-feedback-danger/20 bg-status-rejected-bg px-4 py-3 text-sm font-medium text-status-rejected-fg"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("closedBanner")}</span>
          </div>
        </div>
      )}

      <div
        className={cn(
          "mx-auto max-w-7xl px-4 pb-10 md:grid md:grid-cols-[170px_minmax(0,1fr)_300px] md:gap-6 md:px-6 lg:grid-cols-[200px_minmax(0,1fr)_340px]",
          showBar && "pb-28 md:pb-10",
        )}
      >
        {/* Desktop: category sidebar */}
        <nav aria-label={t("categories")} className="hidden md:block">
          <div className="sticky top-4 mt-6">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {t("categories")}
            </p>
            <ul className="flex flex-col gap-1">
              {chips.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-current={active === c.id && !q ? "true" : undefined}
                    onClick={() => {
                      setActive(c.id);
                      setQuery("");
                    }}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-start text-sm font-semibold transition-colors",
                      active === c.id && !q
                        ? "bg-brand-primary-soft text-brand-primary"
                        : "text-text-secondary hover:bg-surface-card hover:text-text-primary",
                    )}
                    dir="auto"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Products */}
        <main className="min-w-0">
          <div className="sticky top-0 z-20 -mx-4 bg-surface-bg/95 px-4 pb-2 pt-4 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:pt-6 md:backdrop-blur-none">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchLabel")}
                className="h-11 w-full rounded-full border border-border bg-surface-card pe-10 ps-10 text-[15px] placeholder:text-text-secondary/70 focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/15 [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  aria-label={t("close")}
                  onClick={() => setQuery("")}
                  className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-secondary hover:bg-surface-bg"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Mobile: category chips */}
            <div
              role="tablist"
              aria-label={t("categories")}
              className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:hidden"
            >
              {chips.map((c) => {
                const on = active === c.id && !q;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => {
                      setActive(c.id);
                      setQuery("");
                    }}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                      on
                        ? "border-brand-primary bg-brand-primary text-text-inverse"
                        : "border-border bg-surface-card text-text-primary",
                    )}
                    dir="auto"
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {products.length === 0 ? (
            <p className="py-16 text-center text-text-secondary">{t("emptyMenu")}</p>
          ) : visible.length === 0 ? (
            <p className="py-16 text-center text-text-secondary">{t("noResults", { q: query })}</p>
          ) : (
            <div className="mt-2 flex flex-col gap-6">
              {visible.map((s) => (
                <section key={s.id} aria-labelledby={`cat-${s.id}`}>
                  <h2 id={`cat-${s.id}`} className="mb-3 text-lg font-bold" dir="auto">
                    {s.name}
                  </h2>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {s.products.map((p) => {
                      const { price, from } = displayPrice(p);
                      const uKey = unitKey(p.unit);
                      return (
                        <ProductCard
                          key={p.id}
                          name={p.name}
                          description={p.description}
                          price={price}
                          fromPrice={from}
                          fromLabel={t("from")}
                          unitLabel={uKey ? t(uKey) : undefined}
                          photoUrl={p.photo_url}
                          available={p.is_available}
                          soldOutLabel={t("soldOut")}
                          onAdd={() => onProduct(p)}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>

        {/* Desktop: cart panel */}
        <aside aria-label={t("yourCart")} className="hidden md:block">
          <div className="sticky top-4 mt-6 rounded-card border border-border bg-surface-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <ShoppingBag className="h-5 w-5 text-brand-primary" />
              {t("yourCart")}
            </h2>
            {!cart.hydrated || cart.lines.length === 0 ? (
              <div className="py-8 text-center">
                <p className="font-semibold">{t("cartEmpty")}</p>
                <p className="mt-1 text-sm text-text-secondary">{t("cartEmptyHint")}</p>
              </div>
            ) : (
              <>
                <CartLines className="mt-4 max-h-[50vh] overflow-y-auto pe-1" />
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-text-secondary">{t("subtotal")}</span>
                  <span className="text-lg font-bold tabular-nums">{formatRs(cart.subtotal)}</span>
                </div>
                {shop.min_order > 0 && cart.subtotal < shop.min_order && (
                  <p className="mt-2 text-xs font-medium text-status-new-fg">
                    {t("belowMin", {
                      min: formatRs(shop.min_order),
                      more: formatRs(shop.min_order - cart.subtotal),
                    })}
                  </p>
                )}
                {shop.is_open ? (
                  <Link href={checkoutHref} className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full")}>
                    {t("checkout")}
                  </Link>
                ) : (
                  <Button size="lg" className="mt-4 w-full" disabled>
                    {t("closedNow")}
                  </Button>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile: sticky "View cart" bar */}
      {showBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
          {shop.is_open ? (
            <Link
              href={checkoutHref}
              className="flex h-14 w-full items-center justify-between gap-3 rounded-btn bg-brand-primary px-4 text-text-inverse shadow-lg shadow-brand-primary/25"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-white/20 px-1.5 tabular-nums">
                  {cart.count}
                </span>
                <span className="sr-only">{itemsLabel}</span>
              </span>
              <span className="text-base font-bold">{t("viewCart")}</span>
              <span className="font-bold tabular-nums">{formatRs(cart.subtotal)}</span>
            </Link>
          ) : (
            <div className="flex h-14 w-full items-center justify-center rounded-btn bg-text-secondary/80 px-4 text-sm font-semibold text-text-inverse">
              {t("shopClosedCheckout")}
            </div>
          )}
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {openProduct && (
        <OptionsSheet
          key={openProduct.id}
          product={openProduct}
          open
          onClose={() => setOpenProduct(null)}
          onAdd={(line) => {
            addLine(line);
            setOpenProduct(null);
          }}
        />
      )}
    </>
  );
}
