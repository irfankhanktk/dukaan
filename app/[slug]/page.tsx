import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuView } from "@/components/shop/menu-view";
import { getMenu, getShopBySlug, getShopPublicStatus } from "./data";
import { ShopUnavailable } from "@/components/shop/shop-unavailable";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) return { title: "Shop not found", robots: { index: false } };
  const title = `${shop.name} — Order online`;
  const description = `Order from ${shop.name}${shop.area ? `, ${shop.area}` : ""}. Cash on delivery, order sent on WhatsApp.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function ShopPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) {
    // Suspended shops get a friendly notice; shops still in setup (or unknown slugs) 404.
    if ((await getShopPublicStatus(slug)) === "suspended") return <ShopUnavailable />;
    notFound();
  }
  const { categories, products } = await getMenu(shop.id);
  return <MenuView shop={shop} categories={categories} products={products} />;
}
