import type { BusinessType } from "@/lib/types";

export type TemplateKey = "size" | "weight" | "flavour" | "extras" | "text";

export type GroupTemplate = {
  name: string;
  type: "single" | "multiple" | "text";
  is_required: boolean;
  max_select: number | null;
  values: { name: string; price_delta: number }[];
};

const single = (name: string, values: [string, number][], required = true): GroupTemplate => ({
  name,
  type: "single",
  is_required: required,
  max_select: 1,
  values: values.map(([n, p]) => ({ name: n, price_delta: p })),
});

const extras = (values: [string, number][], max = 3): GroupTemplate => ({
  name: "Extras",
  type: "multiple",
  is_required: false,
  max_select: Math.min(max, values.length),
  values: values.map(([n, p]) => ({ name: n, price_delta: p })),
});

const text = (name: string): GroupTemplate => ({
  name,
  type: "text",
  is_required: false,
  max_select: null,
  values: [],
});

const TEMPLATES: Record<BusinessType, Record<TemplateKey, GroupTemplate>> = {
  bakery: {
    size: single("Size", [["1 lb", 0], ["2 lb", 1100], ["3 lb", 2100]]),
    weight: single("Weight", [["500 g", 0], ["1 kg", 450], ["2 kg", 1350]]),
    flavour: single("Flavour", [["Chocolate", 0], ["Vanilla", 0], ["Pineapple", 0], ["Red velvet", 200]]),
    extras: extras([["Birthday candles", 100], ["Extra cream", 200], ["Name topper", 300]]),
    text: text("Message on cake"),
  },
  restaurant: {
    size: single("Size", [["Regular", 0], ["Large", 250]]),
    weight: single("Quantity", [["Half", 0], ["Full", 400]]),
    flavour: single("Spice level", [["Mild", 0], ["Medium", 0], ["Spicy", 0]]),
    extras: extras([["Extra cheese", 150], ["Extra sauce", 50], ["Soft drink", 120]]),
    text: text("Special instructions"),
  },
  home_kitchen: {
    size: single("Serving", [["1 person", 0], ["2 persons", 350], ["Family (4)", 900]]),
    weight: single("Quantity", [["Half kg", 0], ["1 kg", 700]]),
    flavour: single("Spice level", [["Mild", 0], ["Medium", 0], ["Spicy", 0]]),
    extras: extras([["Raita", 60], ["Salad", 50], ["Extra roti", 30]]),
    text: text("Special instructions"),
  },
  grocery: {
    size: single("Pack size", [["Small", 0], ["Medium", 150], ["Large", 300]]),
    weight: single("Weight", [["250 g", 0], ["500 g", 150], ["1 kg", 450]]),
    flavour: single("Flavour", [["Plain", 0], ["Masala", 0]]),
    extras: extras([["Gift wrap", 100], ["Carry bag", 20]], 2),
    text: text("Note for the shop"),
  },
  pharmacy: {
    size: single("Pack size", [["Strip (10)", 0], ["Box (3 strips)", 0]]),
    weight: single("Strength", [["250 mg", 0], ["500 mg", 0]]),
    flavour: single("Flavour", [["Plain", 0], ["Orange", 0]]),
    extras: extras([["Home delivery bag", 20]], 1),
    text: text("Prescription note"),
  },
  clothing: {
    size: single("Size", [["S", 0], ["M", 0], ["L", 0], ["XL", 200]]),
    weight: single("Fabric", [["Lawn", 0], ["Cotton", 300]]),
    flavour: single("Colour", [["Black", 0], ["White", 0], ["Maroon", 0]]),
    extras: extras([["Stitching", 800], ["Gift wrap", 150]], 2),
    text: text("Measurements / note"),
  },
  other: {
    size: single("Size", [["Small", 0], ["Medium", 200], ["Large", 400]]),
    weight: single("Weight", [["500 g", 0], ["1 kg", 300]]),
    flavour: single("Flavour", [["Regular", 0], ["Special", 100]]),
    extras: extras([["Extra 1", 50], ["Extra 2", 100]], 2),
    text: text("Note"),
  },
};

export const QUICK_START: { key: TemplateKey; label: string }[] = [
  { key: "size", label: "+ Size" },
  { key: "weight", label: "+ Weight" },
  { key: "flavour", label: "+ Flavour" },
  { key: "extras", label: "+ Extras" },
];

export function getTemplate(key: TemplateKey, businessType: BusinessType): GroupTemplate {
  const t = (TEMPLATES[businessType] ?? TEMPLATES.other)[key];
  // deep copy so callers can mutate freely
  return { ...t, values: t.values.map((v) => ({ ...v })) };
}

/** Label for the "+ Text" chip, e.g. "+ Message on cake" for bakeries. */
export function textChipLabel(businessType: BusinessType): string {
  return `+ Text (${getTemplate("text", businessType).name.toLowerCase()})`;
}
