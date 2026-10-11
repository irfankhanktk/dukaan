import type { OrderStatus, Unit } from "./types";

/** Rs 2,980 — or lakh grouping (Rs 1,48,600) for large numbers. */
export function formatRs(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}Rs ${new Intl.NumberFormat("en-IN").format(Math.abs(rounded))}`;
}

/**
 * Normalise a Pakistani mobile number to wa.me format: 923001234567.
 * Accepts 03001234567, 0300 1234567, +92 300 1234567, 923001234567, 3001234567.
 * Returns null if it doesn't look like a valid PK mobile number.
 */
export function toWhatsAppNumber(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0092")) digits = digits.slice(2);
  if (digits.startsWith("92") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `92${digits.slice(1)}`;
  if (digits.startsWith("3") && digits.length === 10) return `92${digits}`;
  return null;
}

/** 923001234567 / 03001234567 → "0300 1234567" */
export function formatPhone(input: string): string {
  const wa = toWhatsAppNumber(input);
  if (!wa) return input;
  const local = `0${wa.slice(2)}`;
  return `${local.slice(0, 4)} ${local.slice(4)}`;
}

export function formatQty(quantity: number, unit: Unit): string {
  const q = Number(quantity);
  const n = Number.isInteger(q) ? String(q) : q.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  if (unit === "kg") return `${n} kg`;
  return `${n}x`;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  rejected: "Rejected",
};

/** "2 min ago", "3 h ago", "Yesterday" … */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

const PK_TZ = "Asia/Karachi";

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: PK_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatDate(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: PK_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

/** Start of "today" in Pakistan time, as a UTC ISO string (PKT is UTC+5, no DST). */
export function startOfPkDay(daysAgo = 0, now: Date = new Date()): string {
  const pk = new Date(now.getTime() + 5 * 3600_000);
  pk.setUTCHours(0, 0, 0, 0);
  pk.setUTCDate(pk.getUTCDate() - daysAgo);
  return new Date(pk.getTime() - 5 * 3600_000).toISOString();
}
