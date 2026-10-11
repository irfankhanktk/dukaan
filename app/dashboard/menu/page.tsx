import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink, Plus } from "lucide-react";
import { requireShopOwnerContext } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/types";
import { CategoryManager } from "@/components/menu/category-manager";
import { MenuList, type MenuProduct } from "@/components/menu/menu-list";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const { supabase, shop } = await requireShopOwnerContext();

  const [{ data: categoryRows }, { data: productRows }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("shop_id", shop.id)
      .order("sort_order")
      .order("name"),
    supabase
      .from("products")
      .select(
        "id, name, description, base_price, unit, photo_url, is_available, category_id, sort_order, option_groups(type, is_required, min_select, option_values(price_delta))",
      )
      .eq("shop_id", shop.id)
      .order("sort_order")
      .order("name"),
  ]);

  const categories = (categoryRows ?? []) as Category[];
  const products = (productRows ?? []) as MenuProduct[];

  const productCounts: Record<string, number> = {};
  for (const p of products) {
    if (p.category_id) productCounts[p.category_id] = (productCounts[p.category_id] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-5 p-4 md:gap-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-text-primary md:text-[28px]">Menu</h1>
          <p className="text-[13px] text-text-secondary md:text-sm">
            {products.length} product{products.length === 1 ? "" : "s"} · {categories.length} categor
            {categories.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <Button asChild variant="ghost">
            <Link href={`/${shop.slug}`} target="_blank">
              <ExternalLink /> View shop
            </Link>
          </Button>
          <CategoryManager categories={categories} productCounts={productCounts} />
          <Button asChild>
            <Link href="/dashboard/menu/new">
              <Plus /> Add product
            </Link>
          </Button>
        </div>
      </div>

      <MenuList categories={categories} products={products} productCounts={productCounts} />

      {/* Mobile: sticky add button above the bottom nav */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-2 md:hidden">
        <Button asChild size="lg" className="w-full shadow-lg">
          <Link href="/dashboard/menu/new">
            <Plus /> Add product
          </Link>
        </Button>
      </div>
    </div>
  );
}
