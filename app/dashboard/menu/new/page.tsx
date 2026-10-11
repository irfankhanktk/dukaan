import type { Metadata } from "next";
import { requireShopOwnerContext } from "@/lib/auth";
import type { Category } from "@/lib/types";
import { ProductForm } from "@/components/menu/product-form";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const { supabase, shop } = await requireShopOwnerContext();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("shop_id", shop.id)
    .order("sort_order")
    .order("name");

  return (
    <div className="p-4 md:p-8">
      <ProductForm
        shop={{ id: shop.id, business_type: shop.business_type }}
        categories={(data ?? []) as Category[]}
      />
    </div>
  );
}
