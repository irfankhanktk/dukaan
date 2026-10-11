import { CartProvider } from "@/components/shop/cart";
import { LanguageProvider } from "@/components/shop/language";
import { getLang } from "./data";

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lang = await getLang();
  return (
    <LanguageProvider initialLang={lang}>
      <CartProvider slug={slug}>{children}</CartProvider>
    </LanguageProvider>
  );
}
