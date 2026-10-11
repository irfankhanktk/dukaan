import type { Unit } from "@/lib/types";

/** Minimal shape needed to work out the "from" price a customer sees. */
export type PriceGroup = {
  type: "single" | "multiple" | "text";
  is_required: boolean;
  min_select: number;
  option_values: { price_delta: number }[];
};

/**
 * Cheapest price a customer can order the product for: base price plus the
 * cheapest choices of every group they are forced to pick from.
 * `varies` is true when any choice changes the price (so we show "from Rs …").
 */
export function fromPrice(basePrice: number, groups: PriceGroup[]) {
  let price = basePrice;
  let varies = false;
  for (const g of groups) {
    if (g.type === "text") continue;
    const deltas = g.option_values.map((v) => Number(v.price_delta) || 0).sort((a, b) => a - b);
    if (deltas.some((d) => d !== 0)) varies = true;
    const mustPick =
      g.type === "single"
        ? g.is_required || g.min_select > 0
          ? 1
          : 0
        : Math.max(g.min_select, g.is_required ? 1 : 0);
    for (let i = 0; i < Math.min(mustPick, deltas.length); i++) price += deltas[i]!;
  }
  return { price: Math.max(0, price), varies };
}

export const UNIT_LABELS: Record<Unit, string> = {
  piece: "Piece",
  kg: "kg",
  dozen: "Dozen",
  box: "Box",
};

/** " per kg", " per dozen" … ("" for piece). */
export function unitSuffix(unit: Unit): string {
  return unit === "piece" ? "" : ` per ${unit}`;
}
