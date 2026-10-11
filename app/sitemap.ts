import type { MetadataRoute } from "next";
import { DEMO_SHOP_SLUG, siteUrl } from "@/lib/home-i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    {
      url: `${base}/`,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: { en: `${base}/`, ur: `${base}/?lang=ur` } },
    },
    {
      url: `${base}/${DEMO_SHOP_SLUG}`,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];
}
