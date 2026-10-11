import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutView } from "@/components/shop/checkout-view";
import { getShopBySlug, getShopPublicStatus } from "../data";
import { ShopUnavailable } from "@/components/shop/shop-unavailable";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  return { title: shop ? `Checkout — ${shop.name}` : "Checkout", robots: { index: false } };
}

export default async function CheckoutPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) {
    // Suspended shops get a friendly notice; shops still in setup (or unknown slugs) 404.
    if ((await getShopPublicStatus(slug)) === "suspended") return <ShopUnavailable />;
    notFound();
  }
  return <CheckoutView shop={shop} />;
}
