import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { DEMO_SHOP_SLUG, siteUrl } from "@/lib/home-i18n";

// Rebuilt at most once an hour, so new shops show up without a redeploy.
export const revalidate = 3600;

/** Slugs of every publicly orderable shop (anon RLS: trial / active / payment_due). */
async function publicShopSlugs(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [DEMO_SHOP_SLUG];
  // Cookie-less client: the sitemap is public data and must stay statically cacheable.
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("shops")
    .select("slug")
    .in("status", ["trial", "active", "payment_due"])
    .order("slug");
  if (error || !data) return [DEMO_SHOP_SLUG];
  return data.map((s) => s.slug as string);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const slugs = await publicShopSlugs();
  return [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: { en: `${base}/`, ur: `${base}/?lang=ur` } },
    },
    ...slugs.map((slug) => ({
      url: `${base}/${slug}`,
      changeFrequency: "daily" as const,
      priority: slug === DEMO_SHOP_SLUG ? 0.6 : 0.8,
    })),
  ];
}
