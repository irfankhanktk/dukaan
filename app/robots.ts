import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/home-i18n";
import { isIndexable } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Vercel preview deployments: block everything so they never compete with production.
  if (!isIndexable()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private areas, plus per-customer pages (checkout, order receipts) that have no search value.
      disallow: ["/admin", "/dashboard", "/auth", "/*/checkout", "/*/order/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
