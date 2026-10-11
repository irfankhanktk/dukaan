"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CartLine } from "@/lib/types";
import { roundQty } from "./pricing";

type CartContext = {
  slug: string;
  lines: CartLine[];
  /** true once the saved cart has been read from localStorage */
  hydrated: boolean;
  count: number;
  subtotal: number;
  add: (line: CartLine) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartContext | null>(null);

const storageKey = (slug: string) => `dukaan:cart:${slug}`;

function readCart(slug: string): CartLine[] {
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        !!l &&
        typeof l === "object" &&
        typeof (l as CartLine).key === "string" &&
        typeof (l as CartLine).product_id === "string" &&
        typeof (l as CartLine).quantity === "number" &&
        (l as CartLine).quantity > 0,
    );
  } catch {
    return [];
  }
}

function writeCart(slug: string, lines: CartLine[]) {
  try {
    if (lines.length === 0) window.localStorage.removeItem(storageKey(slug));
    else window.localStorage.setItem(storageKey(slug), JSON.stringify(lines));
  } catch {
    /* private mode / storage full — cart still works in memory */
  }
}

/** Client-side cart for one shop, persisted to localStorage under the shop slug. */
export function CartProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const skipWrite = useRef(true);

  useEffect(() => {
    setLines(readCart(slug));
    setHydrated(true);
  }, [slug]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    writeCart(slug, lines);
  }, [slug, lines, hydrated]);

  // Keep tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey(slug)) setLines(readCart(slug));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [slug]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.key === line.key);
      if (existing) {
        return prev.map((l) =>
          l.key === line.key ? { ...l, quantity: roundQty(l.quantity + line.quantity) } : l,
        );
      }
      return [...prev, { ...line, quantity: roundQty(line.quantity) }];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, quantity: roundQty(quantity) } : l)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    writeCart(slug, []);
  }, [slug]);

  const value = useMemo<CartContext>(() => {
    const subtotal = lines.reduce((s, l) => s + Math.round(l.unit_price * l.quantity), 0);
    // A 1.5 kg line counts as one item in the badge.
    const count = lines.reduce(
      (s, l) => s + (l.unit === "kg" || !Number.isInteger(l.quantity) ? 1 : l.quantity),
      0,
    );
    return { slug, lines, hydrated, count, subtotal, add, setQuantity, remove, clear };
  }, [slug, lines, hydrated, add, setQuantity, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
