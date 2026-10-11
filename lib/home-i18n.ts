/**
 * English + Urdu strings for the marketing homepage (`/`) and the "Register your shop" form.
 * Plain data — usable from Server and Client Components. Language choice reuses the customer
 * site's cookie (LANG_COOKIE in lib/i18n.ts) so a visitor's preference carries across.
 */
import type { BusinessType } from "./types";
import type { Lang } from "./i18n";

/**
 * Monthly price of the Standard plan in rupees.
 *
 * OWNER: set this to the real price (e.g. 2500) when you have decided it. While it is `null`
 * the pricing card shows "Contact us for pricing" instead of a number.
 */
export const PLAN_PRICE: number | null = null;

/** Demo shop shown on the homepage. */
export const DEMO_SHOP_SLUG = "ali-bakers";

/** Prefilled text for the "Message us on WhatsApp" button (kept in English on purpose). */
export const PLATFORM_WHATSAPP_TEXT = "Assalam-o-Alaikum, I want to register my shop on Dukaan.";

/** Values stored in shop_requests.preferred_time. */
export const PREFERRED_TIMES = ["morning", "afternoon", "evening", "anytime"] as const;
export type PreferredTime = (typeof PREFERRED_TIMES)[number];

/** Business types offered on the public form (clothing is supported later, so it is left out). */
export const FORM_BUSINESS_TYPES = [
  "restaurant",
  "home_kitchen",
  "bakery",
  "grocery",
  "pharmacy",
  "other",
] as const satisfies readonly BusinessType[];

export const BUSINESS_TYPE_LABELS: Record<Lang, Record<BusinessType, string>> = {
  en: {
    restaurant: "Restaurant / fast food",
    home_kitchen: "Home kitchen",
    bakery: "Bakery & sweets",
    grocery: "Kiryana / grocery store",
    pharmacy: "Pharmacy",
    clothing: "Clothing",
    other: "Other",
  },
  ur: {
    restaurant: "ریسٹورنٹ / فاسٹ فوڈ",
    home_kitchen: "ہوم کچن",
    bakery: "بیکری اور مٹھائی",
    grocery: "کریانہ اسٹور",
    pharmacy: "فارمیسی",
    clothing: "کپڑے",
    other: "دیگر",
  },
};

const en = {
  meta: {
    title: "Dukaan — Take orders on WhatsApp with your own shop link",
    description:
      "Dukaan gives Pakistani restaurants, home kitchens, bakeries, kiryana stores and pharmacies their own online menu. Customers order from a link and the order arrives on your WhatsApp. Cash on delivery, English and Urdu.",
  },
  nav: {
    howItWorks: "How it works",
    pricing: "Pricing",
    faq: "FAQ",
    login: "Shopkeeper login",
    register: "Register your shop",
    language: "Language",
  },
  hero: {
    eyebrow: "For shops across Pakistan",
    title: "Your shop online. Orders straight to your WhatsApp.",
    body: "Get your own shop link with your menu and prices. Customers choose items, place the order, and it arrives on your WhatsApp — ready to read. No app download for your customers.",
    ctaRegister: "Register your shop",
    ctaDemo: "See a demo shop",
    points: ["No commission per order", "Cash on delivery", "English & Urdu menu"],
  },
  how: {
    title: "How it works",
    subtitle: "Three simple steps. We set everything up for you.",
    steps: [
      {
        title: "We set up your shop",
        body: "Our team adds your menu, prices, photos and delivery areas. You get your own shop link and a QR code for your counter.",
      },
      {
        title: "Customers order from the link",
        body: "Share the link on WhatsApp, Facebook or Instagram. Customers pick items and options — no account, no app.",
      },
      {
        title: "Orders arrive on WhatsApp",
        body: "Every order comes to your WhatsApp as a clear message, and also appears in your Dukaan dashboard with a sound alert.",
      },
    ],
  },
  who: {
    title: "Made for your kind of shop",
    subtitle: "Menus, sizes, weights, extras and messages on cakes — all supported.",
    items: [
      { key: "restaurant", body: "Deals, sizes and extras. Delivery or pickup." },
      { key: "home_kitchen", body: "Daily menus and pre-orders from your kitchen." },
      { key: "bakery", body: "Cakes by pound, a message on the cake, sweets by kg." },
      { key: "grocery", body: "Everyday items by kg, dozen or piece." },
      { key: "pharmacy", body: "Medicines and essentials with home delivery." },
    ] as { key: BusinessType; body: string }[],
  },
  demo: {
    title: "See a real shop page",
    body: "This is how your customers will see your shop. Open the demo, add something to the cart and try the checkout — the order message is prepared for WhatsApp.",
    cta: "Open the demo shop",
    shopName: "Ali Bakers & Sweets",
    shopArea: "Satellite Town, Rawalpindi",
    open: "Open now",
    delivery: "Delivery Rs 100",
    tabs: ["Cakes", "Savoury", "Sweets"],
    products: [
      { name: "Chocolate Fudge Cake", price: "Rs 1,800", note: "1 lb · 2 lb" },
      { name: "Chicken Patties", price: "Rs 120", note: "per piece" },
      { name: "Gulab Jamun", price: "Rs 1,400", note: "per kg" },
    ],
    cart: "View cart · Rs 2,280",
    whatsappTitle: "New Order #1042",
    whatsappBody: "1x Chocolate Fudge Cake (2 lb) – Rs 2,400",
  },
  features: {
    title: "Everything you need to take orders",
    items: [
      {
        title: "Dashboard app with alerts",
        body: "Install the Dukaan dashboard on your Android phone. New orders ring with a sound so you never miss one.",
      },
      {
        title: "English & Urdu menu",
        body: "Customers switch between English and Urdu with one tap.",
      },
      {
        title: "Cash on delivery",
        body: "No payment setup needed. Customers pay when the order arrives.",
      },
      {
        title: "No app for customers",
        body: "Your shop opens in any phone browser. Customers order without making an account.",
      },
      {
        title: "Your menu, your prices",
        body: "Change prices, mark items sold out or add new products any time.",
      },
      {
        title: "Sales summary",
        body: "See today's orders, best sellers and monthly sales at a glance.",
      },
    ],
  },
  pricing: {
    title: "Simple pricing",
    subtitle: "One plan with everything included. No commission on your orders.",
    planName: "Standard",
    perMonth: "/month",
    contactForPrice: "Contact us for pricing",
    features: [
      "Your own shop link + QR code",
      "Unlimited orders, no commission",
      "Menu set up for you by our team",
      "Dashboard app with new-order alerts",
      "English & Urdu shop page",
      "Sales summary",
    ],
    cta: "Register your shop",
  },
  faq: {
    title: "Questions shopkeepers ask",
    items: [
      {
        q: "Do my customers need to install an app?",
        a: "No. Your shop opens in any phone browser from the link. Customers don't need an account either.",
      },
      {
        q: "How do I receive orders?",
        a: "The order is saved in your Dukaan dashboard and the customer sends it to your WhatsApp as a ready-made message. You can call or message them back from the dashboard.",
      },
      {
        q: "Who adds my menu and prices?",
        a: "Our team sets up your shop for you — menu, prices, photos and delivery areas. You can change anything later from your phone.",
      },
      {
        q: "How do customers pay?",
        a: "Cash on delivery for now. Online payments (JazzCash / Easypaisa) are coming later.",
      },
      {
        q: "Do you take a commission on orders?",
        a: "No. You pay a fixed monthly subscription, whatever the number of orders.",
      },
      {
        q: "I don't have an email address. Can I still use Dukaan?",
        a: "Yes. We create your login for you and help you get started on your phone.",
      },
    ],
  },
  register: {
    title: "Register your shop",
    subtitle: "Fill this in — it takes less than a minute. We'll call or message you to set up your shop.",
    ownerName: "Your name",
    ownerNamePlaceholder: "e.g. Ali Raza",
    shopName: "Shop name",
    shopNamePlaceholder: "e.g. Ali Bakers & Sweets",
    businessType: "Type of business",
    chooseType: "Choose one",
    city: "City",
    cityPlaceholder: "e.g. Rawalpindi",
    area: "Area",
    areaPlaceholder: "e.g. Satellite Town",
    whatsapp: "WhatsApp number",
    whatsappPlaceholder: "0300 1234567",
    preferredTime: "Best time to call",
    times: {
      morning: "Morning",
      afternoon: "Afternoon",
      evening: "Evening",
      anytime: "Anytime",
    } as Record<PreferredTime, string>,
    submit: "Send request",
    submitting: "Sending…",
    privacy: "We'll only use your number to contact you about registering your shop.",
    successTitle: "Thank you!",
    successBody: "We'll contact you on WhatsApp soon.",
    sendAnother: "Register another shop",
    preferWhatsapp: "Prefer WhatsApp?",
    preferWhatsappBody: "Send us a message and we'll reply on WhatsApp.",
    messageUs: "Message us on WhatsApp",
    errors: {
      required: "Please fill this in",
      too_long: "This is too long",
      invalid_phone: "Enter a valid mobile number, e.g. 0300 1234567",
      invalid_choice: "Please choose an option",
      rate_limited: "Too many requests from this device. Please try again later or message us on WhatsApp.",
      server: "Something went wrong. Please try again or message us on WhatsApp.",
      check_fields: "Please check the highlighted fields.",
    },
  },
  footer: {
    tagline: "WhatsApp ordering for Pakistani shops.",
    demo: "Demo shop",
    login: "Shopkeeper login",
    rights: "All rights reserved.",
  },
};

export type HomeStrings = typeof en;
export type RequestErrorCode = keyof HomeStrings["register"]["errors"];

const ur: HomeStrings = {
  meta: {
    title: "دکان — اپنی دکان کے لنک سے واٹس ایپ پر آرڈر لیں",
    description:
      "دکان پاکستانی ریسٹورنٹس، ہوم کچن، بیکریوں، کریانہ اسٹورز اور فارمیسیوں کو اپنا آن لائن مینو دیتا ہے۔ گاہک لنک سے آرڈر کرتے ہیں اور آرڈر آپ کے واٹس ایپ پر آ جاتا ہے۔",
  },
  nav: {
    howItWorks: "طریقہ کار",
    pricing: "قیمت",
    faq: "سوالات",
    login: "دکاندار لاگ اِن",
    register: "اپنی دکان رجسٹر کریں",
    language: "زبان",
  },
  hero: {
    eyebrow: "پورے پاکستان کی دکانوں کے لیے",
    title: "آپ کی دکان آن لائن۔ آرڈر سیدھے آپ کے واٹس ایپ پر۔",
    body: "اپنے مینو اور قیمتوں کے ساتھ اپنی دکان کا لنک حاصل کریں۔ گاہک چیزیں چنتے ہیں، آرڈر دیتے ہیں، اور آرڈر آپ کے واٹس ایپ پر آ جاتا ہے۔ گاہکوں کو کوئی ایپ ڈاؤن لوڈ نہیں کرنی پڑتی۔",
    ctaRegister: "اپنی دکان رجسٹر کریں",
    ctaDemo: "ڈیمو دکان دیکھیں",
    points: ["ہر آرڈر پر کوئی کمیشن نہیں", "کیش آن ڈیلیوری", "انگریزی اور اردو مینو"],
  },
  how: {
    title: "یہ کیسے کام کرتا ہے",
    subtitle: "تین آسان مراحل۔ سارا سیٹ اپ ہم کرتے ہیں۔",
    steps: [
      {
        title: "ہم آپ کی دکان سیٹ اپ کرتے ہیں",
        body: "ہماری ٹیم آپ کا مینو، قیمتیں، تصاویر اور ڈیلیوری کے علاقے شامل کرتی ہے۔ آپ کو اپنی دکان کا لنک اور کاؤنٹر کے لیے QR کوڈ ملتا ہے۔",
      },
      {
        title: "گاہک لنک سے آرڈر کرتے ہیں",
        body: "لنک واٹس ایپ، فیس بک یا انسٹاگرام پر شیئر کریں۔ گاہک بغیر اکاؤنٹ اور بغیر ایپ کے چیزیں چنتے ہیں۔",
      },
      {
        title: "آرڈر واٹس ایپ پر آتے ہیں",
        body: "ہر آرڈر واضح پیغام کی صورت میں آپ کے واٹس ایپ پر آتا ہے، اور آواز کے الرٹ کے ساتھ آپ کے ڈیش بورڈ میں بھی نظر آتا ہے۔",
      },
    ],
  },
  who: {
    title: "آپ جیسی دکانوں کے لیے",
    subtitle: "مینو، سائز، وزن، ایکسٹرا اور کیک پر پیغام — سب کچھ ممکن ہے۔",
    items: [
      { key: "restaurant", body: "ڈیلز، سائز اور ایکسٹرا۔ ڈیلیوری یا پک اپ۔" },
      { key: "home_kitchen", body: "روزانہ کا مینو اور پیشگی آرڈر۔" },
      { key: "bakery", body: "پاؤنڈ کے حساب سے کیک، کیک پر پیغام، کلو کے حساب سے مٹھائی۔" },
      { key: "grocery", body: "روزمرہ کی چیزیں کلو، درجن یا عدد کے حساب سے۔" },
      { key: "pharmacy", body: "ادویات اور ضروری اشیاء گھر تک۔" },
    ],
  },
  demo: {
    title: "ایک اصلی دکان کا صفحہ دیکھیں",
    body: "آپ کے گاہک آپ کی دکان ایسے دیکھیں گے۔ ڈیمو کھولیں، کچھ کارٹ میں ڈالیں اور چیک آؤٹ آزمائیں — آرڈر کا پیغام واٹس ایپ کے لیے تیار ہو جاتا ہے۔",
    cta: "ڈیمو دکان کھولیں",
    shopName: "Ali Bakers & Sweets",
    shopArea: "Satellite Town, Rawalpindi",
    open: "ابھی کھلا ہے",
    delivery: "ڈیلیوری Rs 100",
    tabs: ["کیک", "نمکین", "مٹھائی"],
    products: [
      { name: "Chocolate Fudge Cake", price: "Rs 1,800", note: "1 lb · 2 lb" },
      { name: "Chicken Patties", price: "Rs 120", note: "فی عدد" },
      { name: "Gulab Jamun", price: "Rs 1,400", note: "فی کلو" },
    ],
    cart: "کارٹ دیکھیں · Rs 2,280",
    whatsappTitle: "New Order #1042",
    whatsappBody: "1x Chocolate Fudge Cake (2 lb) – Rs 2,400",
  },
  features: {
    title: "آرڈر لینے کے لیے سب کچھ",
    items: [
      {
        title: "الرٹ کے ساتھ ڈیش بورڈ ایپ",
        body: "دکان کا ڈیش بورڈ اپنے اینڈرائیڈ فون پر انسٹال کریں۔ نیا آرڈر آواز کے ساتھ آتا ہے تاکہ کوئی آرڈر نہ چھوٹے۔",
      },
      {
        title: "انگریزی اور اردو مینو",
        body: "گاہک ایک ٹیپ سے انگریزی اور اردو میں بدل سکتے ہیں۔",
      },
      {
        title: "کیش آن ڈیلیوری",
        body: "کسی پیمنٹ سیٹ اپ کی ضرورت نہیں۔ گاہک آرڈر ملنے پر ادائیگی کرتے ہیں۔",
      },
      {
        title: "گاہکوں کے لیے کوئی ایپ نہیں",
        body: "آپ کی دکان کسی بھی فون کے براؤزر میں کھلتی ہے۔ اکاؤنٹ بنانے کی ضرورت نہیں۔",
      },
      {
        title: "آپ کا مینو، آپ کی قیمتیں",
        body: "قیمتیں بدلیں، چیز ختم ہونے پر نشان لگائیں یا نئی چیزیں کسی بھی وقت شامل کریں۔",
      },
      {
        title: "سیلز کا خلاصہ",
        body: "آج کے آرڈر، سب سے زیادہ بکنے والی چیزیں اور ماہانہ سیلز ایک نظر میں۔",
      },
    ],
  },
  pricing: {
    title: "آسان قیمت",
    subtitle: "ایک پلان، سب کچھ شامل۔ آپ کے آرڈرز پر کوئی کمیشن نہیں۔",
    planName: "Standard",
    perMonth: "/ماہانہ",
    contactForPrice: "قیمت کے لیے ہم سے رابطہ کریں",
    features: [
      "آپ کی دکان کا لنک اور QR کوڈ",
      "لامحدود آرڈر، کوئی کمیشن نہیں",
      "مینو ہماری ٹیم سیٹ اپ کرتی ہے",
      "نئے آرڈر کے الرٹ کے ساتھ ڈیش بورڈ ایپ",
      "انگریزی اور اردو دکان کا صفحہ",
      "سیلز کا خلاصہ",
    ],
    cta: "اپنی دکان رجسٹر کریں",
  },
  faq: {
    title: "دکانداروں کے سوالات",
    items: [
      {
        q: "کیا میرے گاہکوں کو ایپ انسٹال کرنی ہوگی؟",
        a: "نہیں۔ آپ کی دکان لنک سے کسی بھی فون کے براؤزر میں کھلتی ہے۔ گاہکوں کو اکاؤنٹ بھی نہیں بنانا پڑتا۔",
      },
      {
        q: "مجھے آرڈر کیسے ملیں گے؟",
        a: "آرڈر آپ کے ڈیش بورڈ میں محفوظ ہو جاتا ہے اور گاہک اسے تیار پیغام کی صورت میں آپ کے واٹس ایپ پر بھیجتا ہے۔",
      },
      {
        q: "میرا مینو اور قیمتیں کون شامل کرے گا؟",
        a: "ہماری ٹیم آپ کی دکان سیٹ اپ کرتی ہے — مینو، قیمتیں، تصاویر اور ڈیلیوری کے علاقے۔ بعد میں آپ فون سے کچھ بھی بدل سکتے ہیں۔",
      },
      {
        q: "گاہک ادائیگی کیسے کرتے ہیں؟",
        a: "فی الحال کیش آن ڈیلیوری۔ آن لائن ادائیگی (جاز کیش / ایزی پیسہ) بعد میں آئے گی۔",
      },
      {
        q: "کیا آپ آرڈرز پر کمیشن لیتے ہیں؟",
        a: "نہیں۔ آپ ایک مقررہ ماہانہ فیس دیتے ہیں، آرڈر جتنے بھی ہوں۔",
      },
      {
        q: "میرے پاس ای میل نہیں ہے۔ کیا میں پھر بھی دکان استعمال کر سکتا ہوں؟",
        a: "جی ہاں۔ ہم آپ کا لاگ اِن بنا دیتے ہیں اور فون پر شروع کرنے میں مدد کرتے ہیں۔",
      },
    ],
  },
  register: {
    title: "اپنی دکان رجسٹر کریں",
    subtitle: "یہ فارم بھریں — ایک منٹ سے کم لگے گا۔ ہم آپ کی دکان سیٹ اپ کرنے کے لیے کال یا میسج کریں گے۔",
    ownerName: "آپ کا نام",
    ownerNamePlaceholder: "مثلاً علی رضا",
    shopName: "دکان کا نام",
    shopNamePlaceholder: "مثلاً Ali Bakers & Sweets",
    businessType: "کاروبار کی قسم",
    chooseType: "ایک منتخب کریں",
    city: "شہر",
    cityPlaceholder: "مثلاً راولپنڈی",
    area: "علاقہ",
    areaPlaceholder: "مثلاً سیٹلائٹ ٹاؤن",
    whatsapp: "واٹس ایپ نمبر",
    whatsappPlaceholder: "0300 1234567",
    preferredTime: "کال کا بہترین وقت",
    times: {
      morning: "صبح",
      afternoon: "دوپہر",
      evening: "شام",
      anytime: "کسی بھی وقت",
    },
    submit: "درخواست بھیجیں",
    submitting: "بھیجا جا رہا ہے…",
    privacy: "ہم آپ کا نمبر صرف آپ کی دکان کی رجسٹریشن کے سلسلے میں رابطے کے لیے استعمال کریں گے۔",
    successTitle: "شکریہ!",
    successBody: "ہم جلد ہی آپ سے واٹس ایپ پر رابطہ کریں گے۔",
    sendAnother: "ایک اور دکان رجسٹر کریں",
    preferWhatsapp: "واٹس ایپ بہتر ہے؟",
    preferWhatsappBody: "ہمیں میسج بھیجیں، ہم واٹس ایپ پر جواب دیں گے۔",
    messageUs: "واٹس ایپ پر میسج کریں",
    errors: {
      required: "یہ خانہ بھریں",
      too_long: "یہ بہت لمبا ہے",
      invalid_phone: "درست موبائل نمبر لکھیں، مثلاً 0300 1234567",
      invalid_choice: "ایک آپشن منتخب کریں",
      rate_limited: "اس ڈیوائس سے بہت زیادہ درخواستیں آئی ہیں۔ بعد میں کوشش کریں یا واٹس ایپ پر میسج کریں۔",
      server: "کچھ غلط ہو گیا۔ دوبارہ کوشش کریں یا واٹس ایپ پر میسج کریں۔",
      check_fields: "نشان زدہ خانے چیک کریں۔",
    },
  },
  footer: {
    tagline: "پاکستانی دکانوں کے لیے واٹس ایپ آرڈرنگ۔",
    demo: "ڈیمو دکان",
    login: "دکاندار لاگ اِن",
    rights: "جملہ حقوق محفوظ ہیں۔",
  },
};

export const HOME_STRINGS: Record<Lang, HomeStrings> = { en, ur };

export function homeStrings(lang: Lang): HomeStrings {
  return HOME_STRINGS[lang];
}

/** English labels for preferred_time values (admin panel). */
export const PREFERRED_TIME_LABELS: Record<PreferredTime, string> = en.register.times;

/** Public base URL (no trailing slash): NEXT_PUBLIC_SITE_URL, else the Vercel URL, else localhost. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}
