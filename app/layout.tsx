import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Dukaan — WhatsApp ordering for your shop",
  description:
    "Take orders from a shop link and receive them on WhatsApp. Built for Pakistani shops.",
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
      </body>
    </html>
  );
}
