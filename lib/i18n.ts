/**
 * English + Urdu strings for the customer shop site.
 * Product / category / shop names are never translated — they stay as the shop entered them.
 *
 * Usable from Server and Client Components (plain data, no React).
 */

export type Lang = "en" | "ur";

export const LANG_COOKIE = "dukaan_lang";
export const LANG_STORAGE_KEY = "dukaan:lang";

const en = {
  // header / menu
  openTill: "Open till {time}",
  openNow: "Open now",
  closedNow: "Closed now",
  closedOpensAt: "Closed now · opens {time}",
  closedToday: "Closed today",
  delivery: "Delivery",
  deliveryFrom: "Delivery from {amount}",
  deliveryFee: "Delivery {amount}",
  freeDelivery: "Free delivery",
  minOrder: "Min order {amount}",
  closedBanner: "This shop is closed right now. You can browse the menu, but ordering is paused.",
  searchPlaceholder: "Search the menu",
  searchLabel: "Search products",
  all: "All",
  categories: "Categories",
  noResults: "Nothing found for “{q}”",
  emptyMenu: "This shop hasn't added any products yet.",
  other: "Other",
  from: "from",
  soldOut: "Sold out",
  perUnit: "/ {unit}",
  unit_kg: "kg",
  unit_dozen: "dozen",
  unit_box: "box",
  unit_piece: "piece",
  added: "{name} added to cart",
  // cart
  yourCart: "Your cart",
  cartEmpty: "Your cart is empty",
  cartEmptyHint: "Add something tasty from the menu.",
  items: "{n} items",
  item: "1 item",
  viewCart: "View cart",
  checkout: "Checkout",
  subtotal: "Subtotal",
  total: "Total",
  remove: "Remove {name}",
  increase: "Increase quantity",
  decrease: "Decrease quantity",
  quantity: "Quantity",
  // options
  required: "Required",
  optional: "Optional",
  chooseOne: "Choose 1",
  chooseUpTo: "Choose up to {n}",
  chooseAtLeast: "Choose at least {n}",
  typeHere: "Type here",
  specialInstructions: "Special instructions",
  specialPlaceholder: "e.g. less sugar, no onions",
  addToCart: "Add to cart",
  close: "Close",
  pleaseChoose: "Please choose {group}",
  // checkout
  back: "Back",
  backToMenu: "Back to menu",
  yourDetails: "Your details",
  name: "Name",
  namePlaceholder: "Your full name",
  phone: "Phone number",
  phoneHint: "The shop will contact you on this number",
  pickup: "Pickup",
  howToGet: "Delivery or pickup",
  address: "Delivery address",
  deliveryArea: "Delivery area",
  chooseArea: "Choose your area",
  areaFee: "{area} · {amount}",
  areaFree: "{area} · Free",
  addressPlaceholder: "House, street, area",
  useLocation: "Use my current location",
  locating: "Getting location…",
  locationAdded: "Location added",
  removeLocation: "Remove location",
  locationError: "Couldn't get your location. Please type your address.",
  orderNote: "Order note (optional)",
  orderNotePlaceholder: "Anything the shop should know?",
  payment: "Payment",
  cashOnDelivery: "Cash on delivery",
  cashOnDeliveryHint: "Pay when you receive your order",
  orderSummary: "Order summary",
  pickupFromShop: "Pickup from shop",
  belowMin: "Minimum order is {min}. Add {more} more.",
  placeOrder: "Place order on WhatsApp",
  placing: "Saving your order…",
  whatsappNote: "Your order is saved first, then WhatsApp opens with your order ready to send.",
  shopClosedCheckout: "The shop is closed right now, so you can't place an order.",
  // validation / errors
  errName: "Please enter your name",
  errPhone: "Please enter a valid mobile number, e.g. 0300 1234567",
  errAddress: "Please enter your delivery address",
  errArea: "Please choose your delivery area",
  errInvalidArea: "The shop doesn't deliver to that area. Please choose an area from the list.",
  errPickupDisabled: "This shop doesn't offer pickup. Please choose delivery.",
  errEmptyCart: "Your cart is empty",
  errShopClosed: "Sorry, the shop is closed right now.",
  errShopNotFound: "This shop could not be found.",
  errUnavailable: "Sorry, {name} is no longer available. Please remove it from your cart.",
  errProductGone: "An item in your cart is no longer on the menu. Please remove it and try again.",
  errOptionRequired: "Please choose {group} for an item in your cart.",
  errTooManyOptions: "Too many choices selected for {group}.",
  errInvalidOption: "An option in your cart has changed. Please remove the item and add it again.",
  errQuantity: "One of the quantities isn't valid.",
  errBelowMin: "Minimum order is {amount}.",
  errGeneric: "Something went wrong. Please try again.",
  // order sent
  orderSaved: "Order #{n} saved!",
  orderSentTitle: "Order sent!",
  orderSentBody: "Send it on WhatsApp so {shop} gets your order.",
  orderSentHint: "Didn't press Send in WhatsApp? Tap the green button to open it again.",
  sendOnWhatsApp: "Send on WhatsApp",
  orderNumber: "Order #{n}",
  deliverTo: "Deliver to",
  language: "Language",
  location: "Location",
  area: "Area",
  // shop unavailable (suspended)
  unavailableTitle: "This shop is not taking orders right now",
  unavailableBody: "Please check again later, or contact the shop directly.",
  poweredBy: "Online ordering by Dukaan",
} as const;

export type I18nKey = keyof typeof en;

const ur: Record<I18nKey, string> = {
  openTill: "{time} تک کھلا ہے",
  openNow: "ابھی کھلا ہے",
  closedNow: "ابھی بند ہے",
  closedOpensAt: "ابھی بند ہے · {time} پر کھلے گا",
  closedToday: "آج بند ہے",
  delivery: "ڈیلیوری",
  deliveryFrom: "ڈیلیوری {amount} سے",
  deliveryFee: "ڈیلیوری {amount}",
  freeDelivery: "مفت ڈیلیوری",
  minOrder: "کم از کم آرڈر {amount}",
  closedBanner: "دکان اس وقت بند ہے۔ آپ مینو دیکھ سکتے ہیں، مگر آرڈر ابھی نہیں ہو سکتا۔",
  searchPlaceholder: "مینو میں تلاش کریں",
  searchLabel: "اشیاء تلاش کریں",
  all: "سب",
  categories: "اقسام",
  noResults: "“{q}” کے لیے کچھ نہیں ملا",
  emptyMenu: "اس دکان نے ابھی کوئی چیز شامل نہیں کی۔",
  other: "دیگر",
  from: "از",
  soldOut: "ختم ہو گیا",
  perUnit: "/ {unit}",
  unit_kg: "کلو",
  unit_dozen: "درجن",
  unit_box: "ڈبہ",
  unit_piece: "عدد",
  added: "{name} کارٹ میں شامل",
  yourCart: "آپ کی کارٹ",
  cartEmpty: "آپ کی کارٹ خالی ہے",
  cartEmptyHint: "مینو سے کچھ مزیدار شامل کریں۔",
  items: "{n} اشیاء",
  item: "1 چیز",
  viewCart: "کارٹ دیکھیں",
  checkout: "چیک آؤٹ",
  subtotal: "ذیلی کل",
  total: "کل رقم",
  remove: "{name} ہٹائیں",
  increase: "تعداد بڑھائیں",
  decrease: "تعداد کم کریں",
  quantity: "تعداد",
  required: "ضروری",
  optional: "اختیاری",
  chooseOne: "ایک چنیں",
  chooseUpTo: "زیادہ سے زیادہ {n} چنیں",
  chooseAtLeast: "کم از کم {n} چنیں",
  typeHere: "یہاں لکھیں",
  specialInstructions: "خاص ہدایات",
  specialPlaceholder: "مثلاً کم چینی، پیاز کے بغیر",
  addToCart: "کارٹ میں ڈالیں",
  close: "بند کریں",
  pleaseChoose: "براہ کرم {group} چنیں",
  back: "واپس",
  backToMenu: "مینو پر واپس",
  yourDetails: "آپ کی تفصیلات",
  name: "نام",
  namePlaceholder: "آپ کا پورا نام",
  phone: "فون نمبر",
  phoneHint: "دکان اسی نمبر پر آپ سے رابطہ کرے گی",
  pickup: "خود لے جائیں",
  howToGet: "ڈیلیوری یا خود لے جائیں",
  address: "ڈیلیوری کا پتہ",
  deliveryArea: "ڈیلیوری کا علاقہ",
  chooseArea: "اپنا علاقہ چنیں",
  areaFee: "{area} · {amount}",
  areaFree: "{area} · مفت",
  addressPlaceholder: "مکان، گلی، علاقہ",
  useLocation: "میری موجودہ لوکیشن استعمال کریں",
  locating: "لوکیشن معلوم کی جا رہی ہے…",
  locationAdded: "لوکیشن شامل ہو گئی",
  removeLocation: "لوکیشن ہٹائیں",
  locationError: "لوکیشن نہیں مل سکی۔ براہ کرم اپنا پتہ لکھیں۔",
  orderNote: "آرڈر نوٹ (اختیاری)",
  orderNotePlaceholder: "دکان کو کچھ بتانا ہے؟",
  payment: "ادائیگی",
  cashOnDelivery: "کیش آن ڈیلیوری",
  cashOnDeliveryHint: "آرڈر ملنے پر ادائیگی کریں",
  orderSummary: "آرڈر کا خلاصہ",
  pickupFromShop: "دکان سے وصولی",
  belowMin: "کم از کم آرڈر {min} ہے۔ مزید {more} کا سامان شامل کریں۔",
  placeOrder: "واٹس ایپ پر آرڈر کریں",
  placing: "آپ کا آرڈر محفوظ ہو رہا ہے…",
  whatsappNote: "پہلے آپ کا آرڈر محفوظ ہوگا، پھر واٹس ایپ آرڈر کے پیغام کے ساتھ کھلے گا۔",
  shopClosedCheckout: "دکان اس وقت بند ہے، اس لیے آرڈر نہیں ہو سکتا۔",
  errName: "براہ کرم اپنا نام لکھیں",
  errPhone: "براہ کرم درست موبائل نمبر لکھیں، مثلاً 0300 1234567",
  errAddress: "براہ کرم ڈیلیوری کا پتہ لکھیں",
  errArea: "براہ کرم اپنا ڈیلیوری کا علاقہ چنیں",
  errInvalidArea: "دکان اس علاقے میں ڈیلیوری نہیں کرتی۔ براہ کرم فہرست سے علاقہ چنیں۔",
  errPickupDisabled: "یہ دکان خود لے جانے کی سہولت نہیں دیتی۔ براہ کرم ڈیلیوری چنیں۔",
  errEmptyCart: "آپ کی کارٹ خالی ہے",
  errShopClosed: "معذرت، دکان اس وقت بند ہے۔",
  errShopNotFound: "یہ دکان نہیں ملی۔",
  errUnavailable: "معذرت، {name} اب دستیاب نہیں۔ براہ کرم اسے کارٹ سے ہٹا دیں۔",
  errProductGone: "کارٹ کی ایک چیز اب مینو میں نہیں۔ براہ کرم اسے ہٹا کر دوبارہ کوشش کریں۔",
  errOptionRequired: "کارٹ کی ایک چیز کے لیے {group} چنیں۔",
  errTooManyOptions: "{group} کے لیے بہت زیادہ انتخاب کیے گئے ہیں۔",
  errInvalidOption: "کارٹ کی ایک چیز کے آپشن بدل گئے ہیں۔ براہ کرم اسے ہٹا کر دوبارہ شامل کریں۔",
  errQuantity: "ایک چیز کی تعداد درست نہیں۔",
  errBelowMin: "کم از کم آرڈر {amount} ہے۔",
  errGeneric: "کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔",
  orderSaved: "آرڈر #{n} محفوظ ہو گیا!",
  orderSentTitle: "آرڈر بھیج دیا گیا!",
  orderSentBody: "اسے واٹس ایپ پر بھیجیں تاکہ {shop} کو آپ کا آرڈر مل جائے۔",
  orderSentHint: "واٹس ایپ میں Send نہیں دبایا؟ سبز بٹن دبا کر دوبارہ کھولیں۔",
  sendOnWhatsApp: "واٹس ایپ پر بھیجیں",
  orderNumber: "آرڈر #{n}",
  deliverTo: "پتہ",
  language: "زبان",
  location: "لوکیشن",
  area: "علاقہ",
  unavailableTitle: "یہ دکان اس وقت آرڈر نہیں لے رہی",
  unavailableBody: "براہ کرم بعد میں دوبارہ دیکھیں، یا دکان سے براہ راست رابطہ کریں۔",
  poweredBy: "آن لائن آرڈر بذریعہ Dukaan",
};

const dictionaries: Record<Lang, Record<I18nKey, string>> = { en, ur };

export type TranslateVars = Record<string, string | number>;

export function translate(lang: Lang, key: I18nKey, vars?: TranslateVars): string {
  let s = dictionaries[lang][key] ?? en[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "ur";
}

export function langDir(lang: Lang): "ltr" | "rtl" {
  return lang === "ur" ? "rtl" : "ltr";
}

/** Maps a place_order RPC error ("OPTION_REQUIRED:Size") to a friendly message. */
export function orderErrorMessage(lang: Lang, raw: string | undefined | null): string {
  const msg = (raw ?? "").trim();
  const [code, ...rest] = msg.split(":");
  const param = rest.join(":").trim();
  switch (code) {
    case "SHOP_CLOSED":
      return translate(lang, "errShopClosed");
    case "SHOP_NOT_FOUND":
      return translate(lang, "errShopNotFound");
    case "NAME_REQUIRED":
      return translate(lang, "errName");
    case "PHONE_REQUIRED":
      return translate(lang, "errPhone");
    case "ADDRESS_REQUIRED":
      return translate(lang, "errAddress");
    case "INVALID_DELIVERY_AREA":
      return translate(lang, "errInvalidArea");
    case "PICKUP_DISABLED":
      return translate(lang, "errPickupDisabled");
    case "EMPTY_CART":
      return translate(lang, "errEmptyCart");
    case "PRODUCT_UNAVAILABLE":
      return translate(lang, "errUnavailable", { name: param });
    case "PRODUCT_NOT_FOUND":
      return translate(lang, "errProductGone");
    case "OPTION_REQUIRED":
      return translate(lang, "errOptionRequired", { group: param });
    case "TOO_MANY_OPTIONS":
      return translate(lang, "errTooManyOptions", { group: param });
    case "INVALID_OPTION":
      return translate(lang, "errInvalidOption");
    case "INVALID_QUANTITY":
    case "CART_TOO_LARGE":
      return translate(lang, "errQuantity");
    case "BELOW_MIN_ORDER": {
      const n = Number(param);
      const amount = Number.isFinite(n)
        ? `Rs ${new Intl.NumberFormat("en-IN").format(n)}`
        : param;
      return translate(lang, "errBelowMin", { amount });
    }
    default:
      return translate(lang, "errGeneric");
  }
}
