export const BUSINESS_TYPES = [
  "restaurant",
  "bakery",
  "home_kitchen",
  "grocery",
  "pharmacy",
  "stationery",
  "clothing",
  "other",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export type Unit = "piece" | "kg" | "dozen" | "box";

export type OrderStatus =
  | "new"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "rejected";

export type Fulfillment = "delivery" | "pickup";

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export type DayHours = { open: string; close: string; closed: boolean }; // "09:00", "23:00"

/** shops.opening_hours — see lib/hours.ts for helpers. */
export type OpeningHours = {
  prep_time?: string; // "30–45 min"
  days?: Partial<Record<DayKey, DayHours>>;
};

/** shops.delivery_areas — empty array means a flat delivery_fee everywhere. */
export type DeliveryArea = { name: string; fee: number };

export const SHOP_STATUSES = ["setup", "trial", "active", "payment_due", "suspended"] as const;
export type ShopStatus = (typeof SHOP_STATUSES)[number];

/** Columns readable by anonymous visitors (see the anon column grant in the migration). */
export const PUBLIC_SHOP_COLUMNS =
  "id, slug, name, city, area, whatsapp_number, logo_url, cover_color, business_type, delivery_fee, delivery_areas, min_order, pickup_enabled, is_open, opening_hours, status";

export type PublicShop = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  area: string | null;
  whatsapp_number: string;
  logo_url: string | null;
  cover_color: string;
  business_type: BusinessType;
  delivery_fee: number;
  delivery_areas: DeliveryArea[];
  min_order: number;
  pickup_enabled: boolean;
  is_open: boolean;
  opening_hours: OpeningHours;
  status: ShopStatus;
};

/** Full shop row (members and super admins). */
export type Shop = PublicShop & {
  owner_id: string | null;
  plan: string;
  monthly_fee: number;
  paid_until: string | null; // date
  onboarding_step: number;
  qr_placed_at: string | null;
  went_live_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type PlatformRole = "super_admin" | "support";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  platform_role: PlatformRole | null;
  created_at: string;
};

export type ShopMemberRole = "owner" | "staff";

export type SubscriptionPayment = {
  id: string;
  shop_id: string;
  amount: number;
  method: "cash" | "jazzcash" | "easypaisa" | "bank";
  period_start: string;
  period_end: string;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type AuditEntry = {
  id: number;
  actor_id: string | null;
  actor_role: string | null;
  shop_id: string | null;
  action: string; // e.g. 'product.update'
  entity: string | null;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
};

export type TemplateOptionGroup = {
  name: string;
  type: "single" | "multiple" | "text";
  is_required: boolean;
  min_select: number;
  max_select: number | null;
  values: { name: string; price_delta: number }[];
};
export type TemplateProduct = {
  name: string;
  description: string | null;
  base_price: number;
  unit: Unit;
  qty_step: number;
  option_groups: TemplateOptionGroup[];
};
export type MenuTemplate = {
  id: string;
  business_type: BusinessType;
  name: string;
  items: { categories: { name: string; products: TemplateProduct[] }[] };
};

export const REQUEST_STATUSES = [
  "new",
  "contacted",
  "visit_scheduled",
  "registered",
  "not_interested",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestSource = "website_form" | "whatsapp" | "in_person" | "referral";

export type ShopRequest = {
  id: string;
  owner_name: string;
  shop_name: string;
  business_type: BusinessType;
  city: string | null;
  area: string | null;
  whatsapp_number: string;
  preferred_time: string | null;
  source: RequestSource;
  status: RequestStatus;
  notes: string | null;
  follow_up_at: string | null;
  converted_shop_id: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  shop_id: string;
  name: string;
  sort_order: number;
};

export type OptionValue = {
  id: string;
  option_group_id: string;
  name: string;
  price_delta: number;
  sort_order: number;
};

export type OptionGroup = {
  id: string;
  product_id: string;
  name: string;
  type: "single" | "multiple" | "text";
  is_required: boolean;
  min_select: number;
  max_select: number | null;
  sort_order: number;
  option_values: OptionValue[];
};

export type Product = {
  id: string;
  shop_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  base_price: number;
  unit: Unit;
  qty_step: number;
  photo_url: string | null;
  is_available: boolean;
  details: Record<string, string>;
  sort_order: number;
};

export type ProductWithOptions = Product & { option_groups: OptionGroup[] };

/** Snapshot stored in order_items.options */
export type OrderItemOption = { group: string; choice: string; price: number };

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit: Unit;
  unit_price: number;
  options: OrderItemOption[];
  note: string | null;
  line_total: number;
};

export type Order = {
  id: string;
  shop_id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  fulfillment: Fulfillment;
  delivery_area: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: "cod";
  status: OrderStatus;
  whatsapp_confirmed: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderWithItems = Order & { order_items: OrderItem[] };

/** Cart line held in client state (prices are display-only; server recalculates). */
export type CartLine = {
  key: string; // product id + chosen options, so identical choices merge
  product_id: string;
  name: string;
  quantity: number;
  unit: Unit;
  qty_step: number;
  unit_price: number; // display only
  option_value_ids: string[];
  texts: { group_id: string; text: string }[];
  options: OrderItemOption[]; // display only
  note?: string;
  photo_url: string | null;
};
