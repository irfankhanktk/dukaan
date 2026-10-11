import { DAY_KEYS, type DayHours, type DayKey, type OpeningHours } from "./types";

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DEFAULT_DAY: DayHours = { open: "09:00", close: "23:00", closed: false };

/** All seven days filled in (missing days get the default hours). */
export function fullWeek(hours: OpeningHours | null | undefined): Record<DayKey, DayHours> {
  const out = {} as Record<DayKey, DayHours>;
  for (const d of DAY_KEYS) out[d] = { ...DEFAULT_DAY, ...(hours?.days?.[d] ?? {}) };
  return out;
}

/** Day key + minutes since midnight in Pakistan time (UTC+5, no DST). */
function pkNow(now: Date = new Date()): { day: DayKey; minutes: number } {
  const pk = new Date(now.getTime() + 5 * 3600_000);
  const jsDay = pk.getUTCDay(); // 0 = Sunday
  const day = DAY_KEYS[(jsDay + 6) % 7];
  return { day, minutes: pk.getUTCHours() * 60 + pk.getUTCMinutes() };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Today's hours (Pakistan time), or null if the shop has no hours set. */
export function todayHours(hours: OpeningHours | null | undefined, now?: Date): DayHours | null {
  if (!hours?.days) return null;
  return fullWeek(hours)[pkNow(now).day];
}

/**
 * Whether the schedule says the shop is open right now. Shops also have a manual
 * is_open switch; the schedule is informational (shown to customers), it does not
 * block orders on its own. Handles closing times after midnight ("01:00").
 */
export function isWithinHours(hours: OpeningHours | null | undefined, now?: Date): boolean | null {
  const today = todayHours(hours, now);
  if (!today) return null;
  if (today.closed) return false;
  const { minutes } = pkNow(now);
  const open = toMinutes(today.open);
  const close = toMinutes(today.close);
  return close > open ? minutes >= open && minutes < close : minutes >= open || minutes < close;
}

/** "23:00" → "11 PM", "09:30" → "9:30 AM" */
export function formatClock(hhmm: string | null | undefined): string | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

/** Closing time today, formatted ("11 PM"), for "Open till 11 PM" chips. */
export function closesToday(hours: OpeningHours | null | undefined, now?: Date): string | null {
  const today = todayHours(hours, now);
  if (!today || today.closed) return null;
  return formatClock(today.close);
}
