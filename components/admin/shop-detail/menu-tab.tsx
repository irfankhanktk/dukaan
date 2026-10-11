import Link from "next/link";
import { LayoutTemplate } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRs } from "@/lib/format";
import type { Category, Product, Shop } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/product-image";
import { ViewAsButton } from "./view-as-button";

const UNIT_SUFFIX: Record<Product["unit"], string> = { piece: "", kg: " / kg", dozen: " / dozen", box: " / box" };

export async function MenuTab({ shop }: { shop: Shop }) {
  const supabase = await createClient();
  const [catRes, prodRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, shop_id, name, sort_order")
      .eq("shop_id", shop.id)
      .order("sort_order")
      .returns<Category[]>(),
    supabase
      .from("products")
      .select("id, category_id, name, base_price, unit, photo_url, is_available, sort_order")
      .eq("shop_id", shop.id)
      .order("sort_order")
      .order("name")
      .returns<Pick<Product, "id" | "category_id" | "name" | "base_price" | "unit" | "photo_url" | "is_available" | "sort_order">[]>(),
  ]);
  const categories = catRes.data ?? [];
  const products = prodRes.data ?? [];

  const groups = categories.map((c) => ({
    id: c.id,
    name: c.name,
    products: products.filter((p) => p.category_id === c.id),
  }));
  const known = new Set(categories.map((c) => c.id));
  const uncategorised = products.filter((p) => !p.category_id || !known.has(p.category_id));
  if (uncategorised.length) groups.push({ id: "none", name: "Uncategorised", products: uncategorised });

  const photos = products.filter((p) => p.photo_url).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-card p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <p className="text-sm text-text-secondary">
          {products.length} product{products.length === 1 ? "" : "s"} in {categories.length} categor
          {categories.length === 1 ? "y" : "ies"} · {photos} of {products.length} with photos
        </p>
        <div className="flex flex-wrap gap-2">
          <ViewAsButton shopId={shop.id} next="/dashboard/menu" label="Edit menu as shopkeeper" size="sm" />
          <Button asChild variant="secondary" size="sm">
            <Link href={`/admin/shops/${shop.id}/setup?step=4`}>
              <LayoutTemplate /> Menu setup (templates / CSV)
            </Link>
          </Button>
        </div>
      </div>

      {(catRes.error || prodRes.error) && (
        <p className="rounded-xl bg-status-rejected-bg px-4 py-3 text-sm text-status-rejected-fg">
          Couldn&apos;t load the menu: {(catRes.error ?? prodRes.error)?.message}
        </p>
      )}

      {products.length === 0 && !prodRes.error ? (
        <div className="rounded-card border border-dashed border-border px-4 py-10 text-center text-sm text-text-secondary">
          No products yet. Start from a template, import a CSV or add products one by one in menu setup.
        </div>
      ) : (
        groups
          .filter((g) => g.products.length > 0)
          .map((g) => (
            <section key={g.id} className="overflow-hidden rounded-card border border-border bg-surface-card">
              <h3 className="border-b border-border bg-surface-bg px-4 py-2.5 text-sm font-bold">
                {g.name} <span className="font-normal text-text-secondary">· {g.products.length}</span>
              </h3>
              <ul className="divide-y divide-border">
                {g.products.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <ProductImage src={p.photo_url} alt={p.name} className="h-12 w-12 shrink-0 [&_svg]:h-5 [&_svg]:w-5" />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</p>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatRs(p.base_price)}
                      <span className="font-normal text-text-secondary">{UNIT_SUFFIX[p.unit]}</span>
                    </p>
                    <Badge variant={p.is_available ? "delivered" : "unconfirmed"} className="hidden sm:inline-flex">
                      {p.is_available ? "Available" : "Unavailable"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}
    </div>
  );
}
