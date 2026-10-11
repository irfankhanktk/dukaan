import type { RequestSource, RequestStatus } from "@/lib/types";

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: "New",
  contacted: "Contacted",
  visit_scheduled: "Visit scheduled",
  registered: "Registered",
  not_interested: "Not interested",
};

/** Badge colours per lead status (reuses the order status tokens). */
export const REQUEST_STATUS_CLASSES: Record<RequestStatus, string> = {
  new: "bg-status-new-bg text-status-new-fg",
  contacted: "bg-status-preparing-bg text-status-preparing-fg",
  visit_scheduled: "bg-status-out-bg text-status-out-fg",
  registered: "bg-status-delivered-bg text-status-delivered-fg",
  not_interested: "bg-status-unconfirmed-bg text-status-unconfirmed-fg",
};

export const REQUEST_SOURCE_LABELS: Record<RequestSource, string> = {
  website_form: "Website form",
  whatsapp: "WhatsApp",
  in_person: "In person",
  referral: "Referral",
};

export const MANUAL_SOURCES = ["whatsapp", "in_person", "referral"] as const;

const PK_TZ = "Asia/Karachi";

/** ISO timestamp → "YYYY-MM-DD" in Pakistan time (for <input type="date">). */
export function toPkDateInput(iso: string | null | Date): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** "YYYY-MM-DD" → timestamptz at 09:00 Pakistan time (UTC+5, no DST). */
export function pkDateToIso(date: string): string {
  return new Date(`${date}T09:00:00+05:00`).toISOString();
}

/** "12 Oct" style short date in Pakistan time. */
export function formatShortPkDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: PK_TZ, day: "numeric", month: "short" }).format(
    new Date(iso),
  );
}
