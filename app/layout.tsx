import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Noto_Nastaliq_Urdu } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { siteUrl } from "@/lib/home-i18n";
import { isIndexable } from "@/lib/seo";
import "./globals.css";

const indexable = isIndexable();

export const metadata: Metadata = {
  // Always the production domain (never the per-deployment Vercel URL) so canonicals and OG links agree.
  metadataBase: new URL(siteUrl()),
  title: "Dukaan — WhatsApp ordering for your shop",
  description:
    "Take orders from your own shop link and receive them on WhatsApp. Online menus for Pakistani restaurants, bakeries, home kitchens, grocery stores and pharmacies.",
  applicationName: "Dukaan",
  openGraph: { type: "website", siteName: "Dukaan", locale: "en_PK" },
  twitter: { card: "summary_large_image" },
  // Preview deployments are never indexed (see also robots.ts and the X-Robots-Tag header).
  robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#0F5C4A",
  width: "device-width",
  initialScale: 1,
};

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  display: "swap",
  subsets: ["latin"],
});

const urdu = Noto_Nastaliq_Urdu({
  variable: "--font-urdu",
  display: "swap",
  subsets: ["arabic"],
  weight: ["400", "700"],
  // Large font only needed when Urdu is chosen; don't preload it on every (mostly English) page.
  preload: false,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${urdu.variable} font-sans`}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
