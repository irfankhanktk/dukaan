import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuView } from "@/components/shop/menu-view";
import { getMenu, getShopBySlug, getShopPublicStatus } from "./data";
import { ShopUnavailable } from "@/components/shop/shop-unavailable";
import { jsonLd, shopBreadcrumbJsonLd, shopDescription, shopJsonLd, shopTitle } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) return { title: "Shop not found", robots: { index: false } };
  const { products } = await getMenu(shop.id);
  const title = shopTitle(shop);
  const description = shopDescription(shop, products);
  const url = `/${shop.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: "Dukaan", locale: "en_PK" },
    twitter: { card: "summary_large_image", title, description },
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
  const description = shopDescription(shop, products);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(shopJsonLd(shop, categories, products, description)) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(shopBreadcrumbJsonLd(shop)) }} />
      <MenuView shop={shop} categories={categories} products={products} />
    </>
  );
}
