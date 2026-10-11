import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireShopOwnerContext } from "@/lib/auth";
import type { Category, ProductWithOptions } from "@/lib/types";
import { ProductForm } from "@/components/menu/product-form";

export const metadata: Metadata = { title: "Edit product" };

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_RE.test(id)) notFound();

  const { supabase, shop } = await requireShopOwnerContext();
  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*, option_groups(*, option_values(*))")
      .eq("id", id)
      .eq("shop_id", shop.id)
      .maybeSingle<ProductWithOptions>(),
    supabase
      .from("categories")
      .select("*")
      .eq("shop_id", shop.id)
      .order("sort_order")
      .order("name"),
  ]);
  if (!product) notFound();

  return (
    <div className="p-4 md:p-8">
      <ProductForm
        key={product.id}
        shop={{ id: shop.id, business_type: shop.business_type }}
        categories={(categories ?? []) as Category[]}
        product={product}
      />
    </div>
  );
}
