import type { I18nKey } from "@/lib/i18n";
import type { OptionGroup, ProductWithOptions, Unit } from "@/lib/types";

/** Round to 2 decimals so 0.5-kg steps never drift (0.1 + 0.2 …). */
export function roundQty(q: number): number {
  return Math.round(q * 100) / 100;
}

/** Quantity added by default: 1 when it is a multiple of the step (0.5 kg → 1 kg), else one step. */
export function defaultQty(step: number): number {
  const s = step > 0 ? step : 1;
  const ratio = 1 / s;
  return Math.abs(ratio - Math.round(ratio)) < 1e-9 ? 1 : roundQty(s);
}

export function unitKey(unit: Unit): I18nKey | null {
  switch (unit) {
    case "kg":
      return "unit_kg";
    case "dozen":
      return "unit_dozen";
    case "box":
      return "unit_box";
    default:
      return null;
  }
}

/** Cheapest valid combination of choices for a group (required / min_select). */
function minGroupDelta(g: OptionGroup): number {
  if (g.type === "text") return 0;
  const needed = Math.max(g.min_select ?? 0, g.is_required ? 1 : 0);
  if (needed === 0) return 0;
  const deltas = g.option_values.map((v) => v.price_delta).sort((a, b) => a - b);
  return deltas.slice(0, needed).reduce((s, d) => s + d, 0);
}

/** Price shown on the product card, and whether it is a "from" price. */
export function displayPrice(p: ProductWithOptions): { price: number; from: boolean } {
  let price = p.base_price;
  let from = false;
  for (const g of p.option_groups) {
    if (g.type === "text" || g.option_values.length === 0) continue;
    price += minGroupDelta(g);
    const deltas = new Set(g.option_values.map((v) => v.price_delta));
    const required = g.is_required || (g.min_select ?? 0) > 0;
    if (deltas.size > 1 || (!required && g.option_values.some((v) => v.price_delta > 0))) {
      from = true;
    }
  }
  return { price: Math.max(0, price), from };
}

export function hasOptions(p: ProductWithOptions): boolean {
  return p.option_groups.some((g) => g.type === "text" || g.option_values.length > 0);
}

/** Stable key so identical choices merge into one cart line. */
export function lineKey(
  productId: string,
  valueIds: string[],
  texts: { group_id: string; text: string }[],
  note?: string,
): string {
  const v = [...valueIds].sort().join(",");
  const t = texts
    .filter((x) => x.text)
    .map((x) => `${x.group_id}=${x.text}`)
    .sort()
    .join("|");
  return `${productId}::${v}::${t}::${note ?? ""}`;
}
