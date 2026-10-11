import type { BusinessType, Category, DayKey, ProductWithOptions, PublicShop } from "@/lib/types";
import { DAY_KEYS } from "@/lib/types";
import { siteUrl } from "@/lib/home-i18n";

/**
 * True only on the deployment that should be indexed. Vercel preview/development deployments
 * (`VERCEL_ENV` = preview | development) are noindexed so they never compete with production.
 * Outside Vercel (local dev, self-hosting) we treat the build as indexable.
 */
export function isIndexable(): boolean {
  const env = process.env.VERCEL_ENV;
  return !env || env === "production";
}

/** Trims text to `max` characters on a word boundary, adding an ellipsis if cut. */
export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

const TYPE_NOUN: Record<BusinessType, string> = {
  restaurant: "restaurant",
  bakery: "bakery",
  home_kitchen: "home kitchen",
  grocery: "grocery store",
  pharmacy: "pharmacy",
  stationery: "stationery shop",
  clothing: "clothing shop",
  other: "shop",
};

/** "Satellite Town, Rawalpindi" — whichever parts exist. */
export function shopPlace(shop: Pick<PublicShop, "area" | "city">): string {
  return [shop.area, shop.city].filter(Boolean).join(", ");
}

/** Page title for a shop, kept under ~60 characters (the root template adds nothing). */
export function shopTitle(shop: PublicShop): string {
  const full = `${shop.name} – Order Online${shop.city ? ` in ${shop.city}` : ""}`;
  if (full.length <= 60) return full;
  const short = `${shop.name} – Order Online`;
  return short.length <= 60 ? short : clip(shop.name, 60);
}

/** Meta description for a shop, aimed at 150–160 characters. */
export function shopDescription(shop: PublicShop, products: ProductWithOptions[]): string {
  const place = shopPlace(shop);
  const noun = TYPE_NOUN[shop.business_type] ?? "shop";
  const lead = `Order from ${shop.name}, ${noun}${place ? ` in ${place}` : ""}.`;
  const names = products
    .filter((p) => p.is_available)
    .slice(0, 4)
    .map((p) => p.name);
  const menu = names.length ? ` Menu: ${names.join(", ")} and more.` : "";
  const tail = " Cash on delivery, order sent on WhatsApp.";
  const base = `${lead}${tail}`;
  // Add the menu teaser only while it fits; otherwise fall back to the shorter sentence.
  if (`${lead}${menu}${tail}`.length <= 160) return `${lead}${menu}${tail}`;
  if (names.length && base.length < 120) {
    return clip(`${lead}${tail} Menu: ${names.join(", ")}.`, 160);
  }
  return clip(base, 160);
}

/* ------------------------------------------------------------------ JSON-LD */

/** Serialises JSON-LD for a <script> tag without allowing `</script>` breakouts. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const SCHEMA_TYPE: Record<BusinessType, string> = {
  restaurant: "Restaurant",
  bakery: "Bakery",
  home_kitchen: "FoodEstablishment",
  grocery: "GroceryStore",
  pharmacy: "Pharmacy",
  stationery: "Store",
  clothing: "ClothingStore",
  other: "Store",
};
const FOOD_TYPES = new Set<BusinessType>(["restaurant", "bakery", "home_kitchen"]);

const SCHEMA_DAY: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function openingHoursSpec(shop: PublicShop) {
  const days = shop.opening_hours?.days;
  if (!days) return undefined;
  const spec = DAY_KEYS.flatMap((d) => {
    const h = days[d];
    if (!h || h.closed || !h.open || !h.close) return [];
    return [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${SCHEMA_DAY[d]}`,
        opens: h.open,
        closes: h.close,
      },
    ];
  });
  return spec.length ? spec : undefined;
}

function offer(price: number, available: boolean) {
  return {
    "@type": "Offer",
    price,
    priceCurrency: "PKR",
    availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
  };
}

/**
 * schema.org LocalBusiness (Restaurant, Bakery, GroceryStore, …) for a shop page, with its menu
 * (food shops) or offer catalog (other shops). Prices are integer PKR straight from the DB.
 */
export function shopJsonLd(
  shop: PublicShop,
  categories: Category[],
  products: ProductWithOptions[],
  description: string,
) {
  const base = siteUrl();
  const url = `${base}/${shop.slug}`;
  const known = new Set(categories.map((c) => c.id));
  const groups = [
    ...categories.map((c) => ({ name: c.name, items: products.filter((p) => p.category_id === c.id) })),
    { name: "Other", items: products.filter((p) => !p.category_id || !known.has(p.category_id)) },
  ].filter((g) => g.items.length > 0);

  const isFood = FOOD_TYPES.has(shop.business_type);
  const item = (p: ProductWithOptions) => ({
    "@type": isFood ? "MenuItem" : "Product",
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    ...(p.photo_url ? { image: p.photo_url } : {}),
    offers: offer(p.base_price, p.is_available),
  });

  const catalog = isFood
    ? {
        hasMenu: {
          "@type": "Menu",
          name: `${shop.name} menu`,
          url,
          hasMenuSection: groups.map((g) => ({
            "@type": "MenuSection",
            name: g.name,
            hasMenuItem: g.items.map(item),
          })),
        },
      }
    : {
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: `${shop.name} products`,
          itemListElement: groups.map((g) => ({
            "@type": "OfferCatalog",
            name: g.name,
            itemListElement: g.items.map((p) => ({ ...offer(p.base_price, p.is_available), itemOffered: item(p) })),
          })),
        },
      };

  return {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPE[shop.business_type] ?? "Store",
    "@id": `${url}#shop`,
    name: shop.name,
    description,
    url,
    ...(shop.logo_url ? { logo: shop.logo_url, image: shop.logo_url } : { image: `${url}/opengraph-image` }),
    telephone: `+${shop.whatsapp_number}`,
    currenciesAccepted: "PKR",
    paymentAccepted: "Cash",
    address: {
      "@type": "PostalAddress",
      ...(shop.area ? { streetAddress: shop.area } : {}),
      ...(shop.city ? { addressLocality: shop.city } : {}),
      addressCountry: "PK",
    },
    ...(shop.city ? { areaServed: { "@type": "City", name: shop.city } } : {}),
    ...(openingHoursSpec(shop) ? { openingHoursSpecification: openingHoursSpec(shop) } : {}),
    potentialAction: {
      "@type": "OrderAction",
      target: { "@type": "EntryPoint", urlTemplate: url, actionPlatform: "https://schema.org/MobileWebPlatform" },
      deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet",
    },
    ...catalog,
  };
}

/** Breadcrumb: Dukaan › Shop. */
export function shopBreadcrumbJsonLd(shop: PublicShop) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Dukaan", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: shop.name, item: `${base}/${shop.slug}` },
    ],
  };
}