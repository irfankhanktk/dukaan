import { toWhatsAppNumber } from "./format";

/**
 * Shop owners log in with their phone number + password (see CLAUDE.md, "how shop owners log in").
 * Supabase phone sign-in needs an SMS provider, so each owner gets an internal email login
 * derived from the phone number. No mail is ever sent to these addresses.
 *
 * The default uses the reserved ".invalid" TLD so a stray password-reset email can never be
 * delivered to someone else's domain. If your Supabase project rejects it, set
 * NEXT_PUBLIC_PHONE_LOGIN_DOMAIN to a subdomain YOU control that receives no mail.
 */
export const PHONE_LOGIN_DOMAIN =
  process.env.NEXT_PUBLIC_PHONE_LOGIN_DOMAIN || "phone.dukaan.invalid";

/** 0300 1234567 → 923001234567@phone.dukaan.invalid */
export function phoneToLoginEmail(phone: string): string | null {
  const wa = toWhatsAppNumber(phone);
  return wa ? `${wa}@${PHONE_LOGIN_DOMAIN}` : null;
}

export function isPhoneLoginEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${PHONE_LOGIN_DOMAIN}`);
}

/**
 * What the user typed in the login box → the email Supabase knows.
 * Anything containing "@" is treated as a real email; otherwise as a phone number.
 */
export function loginIdentifierToEmail(input: string): string | null {
  const v = input.trim();
  if (v.includes("@")) return v.toLowerCase();
  return phoneToLoginEmail(v);
}

/** Readable temporary password, e.g. "dukaan-4821-kite". */
export function generateTempPassword(): string {
  const words = ["kite", "mango", "chai", "rose", "lamp", "river", "star", "tiger", "pearl", "cloud"];
  const n = new Uint32Array(2);
  crypto.getRandomValues(n);
  return `dukaan-${1000 + (n[0] % 9000)}-${words[n[1] % words.length]}`;
}
