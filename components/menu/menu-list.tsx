"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Search } from "lucide-react";
import { ProductImage } from "@/components/ui/product-image";
import { formatRs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category, Unit } from "@/lib/types";
import { toggleAvailability } from "@/app/dashboard/menu/actions";
import { CategoryManager } from "./category-manager";
import { fromPrice, unitSuffix, type PriceGroup } from "./price";
import { Switch } from "./switch";

export type MenuProduct = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  unit: Unit;
  photo_url: string | null;
  is_available: boolean;
  category_id: string | null;
  option_groups: PriceGroup[];
};

const UNCATEGORISED = "__none__";

function priceLine(p: MenuProduct) {
  const { price, varies } = fromPrice(p.base_price, p.option_groups);
  return `${varies ? "from " : ""}${formatRs(price)}${unitSuffix(p.unit)}`;
}

function optionsLine(n: number) {
  return n === 0 ? "No options" : `${n} option group${n === 1 ? "" : "s"}`;
}

export function MenuList({
  categories,
  products,
  productCounts,
}: {
  categories: Category[];
  products: MenuProduct[];
  productCounts: Record<string, number>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const hasUncategorised = products.some((p) => !p.category_id || !categoryName.has(p.category_id));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const cat = p.category_id && categoryName.has(p.category_id) ? p.category_id : UNCATEGORISED;
      if (filter !== "all" && cat !== filter) return false;
      if (q && !p.name.toLowerCase().includes(q) && !(p.description ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, query, filter, categoryName]);

  const sections = useMemo(() => {
    const order = [...categories.map((c) => ({ id: c.id, name: c.name })), { id: UNCATEGORISED, name: "Uncategorised" }];
    return order
      .map((s) => ({
        ...s,
        items: visible.filter((p) =>
          s.id === UNCATEGORISED ? !p.category_id || !categoryName.has(p.category_id) : p.category_id === s.id,
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [categories, visible, categoryName]);

  const isAvailable = (p: MenuProduct) => overrides[p.id] ?? p.is_available;

  function toggle(p: MenuProduct, next: boolean) {
    setError(null);
    setOverrides((o) => ({ ...o, [p.id]: next }));
    startTransition(async () => {
      const res = await toggleAvailability(p.id, next);
      if (!res.ok) {
        setError(`${p.name}: ${res.error}`);
      }
      // Drop the override either way: on success fresh props carry the new value.
      setOverrides((o) => {
        const copy = { ...o };
        delete copy[p.id];
        return copy;
      });
    });
  }

  const chipClass = (active: boolean) =>
    cn(
      "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
      active
        ? "border-brand-primary bg-brand-primary text-text-inverse"
        : "border-border bg-surface-card text-text-primary hover:border-brand-primary/40",
    );

  return (
    <div className="flex flex-col gap-4">
      {/* Search + filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative block md:w-80">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your products"
            aria-label="Search your products"
            className="h-12 w-full rounded-xl border border-border bg-surface-card pl-12 pr-4 text-[15px] placeholder:text-text-secondary/70 focus-visible:border-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/15"
          />
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
          <button type="button" className={chipClass(filter === "all")} onClick={() => setFilter("all")}>
            All
          </button>
          {categories.map((c) => (
            <button key={c.id} type="button" className={chipClass(filter === c.id)} onClick={() => setFilter(c.id)}>
              {c.name}
            </button>
          ))}
          {hasUncategorised && (
            <button
              type="button"
              className={chipClass(filter === UNCATEGORISED)}
              onClick={() => setFilter(UNCATEGORISED)}
            >
              Uncategorised
            </button>
          )}
          <span className="md:hidden">
            <CategoryManager categories={categories} productCounts={productCounts} variant="chip" />
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-feedback-danger/30 bg-feedback-danger/5 px-4 py-3 text-sm text-feedback-danger">
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-surface-card px-6 py-12 text-center">
          <p className="font-semibold text-text-primary">
            {products.length === 0 ? "No products yet" : "No products match"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {products.length === 0
              ? "Add your first product so customers can start ordering."
              : "Try a different search or category."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: cards grouped by category */}
          <div className="flex flex-col gap-5 md:hidden">
            {sections.map((s) => (
              <section key={s.id} className="flex flex-col gap-2.5">
                {(sections.length > 1 || filter === "all") && (
                  <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {s.name} · {s.items.length}
                  </h2>
                )}
                {s.items.map((p) => {
                  const on = isAvailable(p);
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "relative flex items-center gap-3 rounded-card border border-border p-3",
                        on ? "bg-surface-card" : "bg-surface-card/50",
                      )}
                    >
                      <Link
                        href={`/dashboard/menu/${p.id}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                        aria-label={`Edit ${p.name}`}
                      >
                        <ProductImage
                          src={p.photo_url}
                          alt={p.name}
                          className={cn("h-[52px] w-[52px] shrink-0", !on && "opacity-60")}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate font-semibold", on ? "text-text-primary" : "text-text-secondary")}>
                            {p.name}
                          </p>
                          {on ? (
                            <p className="truncate text-[13px] text-text-secondary">
                              {priceLine(p)}
                              {p.option_groups.length > 0 && ` · ${optionsLine(p.option_groups.length)}`}
                            </p>
                          ) : (
                            <p className="truncate text-[13px] text-feedback-danger">Hidden from customers</p>
                          )}
                        </div>
                      </Link>
                      <Switch
                        checked={on}
                        onCheckedChange={(next) => toggle(p, next)}
                        label={`${p.name} available`}
                      />
                    </div>
                  );
                })}
              </section>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface-card md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-bg/60 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Price</th>
                  <th className="hidden px-3 py-3 font-semibold lg:table-cell">Options</th>
                  <th className="px-3 py-3 font-semibold">Available</th>
                  <th className="w-14 px-3 py-3">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const on = isAvailable(p);
                  return (
                    <tr key={p.id} className="border-t border-border first:border-t-0 hover:bg-surface-bg/50">
                      <td className="px-5 py-3">
                        <Link href={`/dashboard/menu/${p.id}`} className="flex items-center gap-3">
                          <ProductImage
                            src={p.photo_url}
                            alt={p.name}
                            className={cn("h-11 w-11 shrink-0", !on && "opacity-60")}
                          />
                          <div className="min-w-0">
                            <p className={cn("font-semibold", on ? "text-text-primary" : "text-text-secondary")}>
                              {p.name}
                            </p>
                            {on ? (
                              p.description && (
                                <p className="line-clamp-1 max-w-xs text-xs text-text-secondary">{p.description}</p>
                              )
                            ) : (
                              <p className="text-xs text-feedback-danger">Hidden from customers</p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-text-secondary">
                        {(p.category_id && categoryName.get(p.category_id)) || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-medium text-text-primary">{priceLine(p)}</td>
                      <td className="hidden px-3 py-3 text-text-secondary lg:table-cell">
                        {optionsLine(p.option_groups.length)}
                      </td>
                      <td className="px-3 py-3">
                        <Switch
                          checked={on}
                          onCheckedChange={(next) => toggle(p, next)}
                          label={`${p.name} available`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/dashboard/menu/${p.id}`}
                          aria-label={`Edit ${p.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-brand-primary-soft hover:text-brand-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
