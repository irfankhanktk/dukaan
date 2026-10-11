import { shopOgImage } from "@/lib/og";
import { getShopBySlug } from "./data";

export const alt = "Order online from this shop on Dukaan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return shopOgImage(await getShopBySlug(slug));
}
