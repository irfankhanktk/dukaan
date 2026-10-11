import "server-only";
import { createAdminClient } from "./supabase/admin";
import { logAudit } from "./audit";
import { toWhatsAppNumber, formatPhone } from "./format";
import { phoneToLoginEmail } from "./login";
import { waLink } from "./whatsapp";

type AdminClient = ReturnType<typeof createAdminClient>;

async function findUserByEmail(admin: AdminClient, email: string) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

export type OwnerResult =
  | { ok: true; userId: string; created: boolean; loginPhone: string; tempPassword: string | null }
  | { ok: false; error: string };

/**
 * Create (or reuse) the owner's login and make them the shop's owner.
 * Owners log in with phone + password; the phone maps to an internal email (lib/login.ts).
 * A new login gets the temporary password and must change it on first login.
 * Call only after requireSuperAdmin().
 */
export async function createOrLinkOwner(input: {
  actorId: string;
  shopId: string;
  fullName: string;
  phone: string;
  contactEmail?: string | null;
  tempPassword: string;
}): Promise<OwnerResult> {
  const wa = toWhatsAppNumber(input.phone);
  const loginEmail = phoneToLoginEmail(input.phone);
  if (!wa || !loginEmail) return { ok: false, error: "Enter a valid Pakistani mobile number." };

  const admin = createAdminClient();
  let user = await findUserByEmail(admin, loginEmail);
  let created = false;

  if (!user) {
    if (input.tempPassword.length < 8) {
      return { ok: false, error: "Temporary password must be at least 8 characters." };
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: loginEmail,
      password: input.tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        phone: wa,
        contact_email: input.contactEmail || null,
        must_change_password: true,
      },
    });
    if (error || !data.user) return { ok: false, error: error?.message ?? "Could not create login." };
    user = data.user;
    created = true;
  }

  await admin
    .from("profiles")
    .upsert({ id: user.id, full_name: input.fullName, phone: wa }, { onConflict: "id" });

  const { error: memberError } = await admin
    .from("shop_members")
    .upsert({ shop_id: input.shopId, user_id: user.id, role: "owner" }, { onConflict: "shop_id,user_id" });
  if (memberError) return { ok: false, error: memberError.message };

  // Single-owner MVP: the new owner replaces any previous owner membership.
  await admin
    .from("shop_members")
    .delete()
    .eq("shop_id", input.shopId)
    .eq("role", "owner")
    .neq("user_id", user.id);
  await admin.from("shops").update({ owner_id: user.id }).eq("id", input.shopId);

  await logAudit({
    actorId: input.actorId,
    shopId: input.shopId,
    action: created ? "owner.create" : "owner.link",
    entity: "user",
    entityId: user.id,
    after: { full_name: input.fullName, phone: wa },
  });

  return {
    ok: true,
    userId: user.id,
    created,
    loginPhone: formatPhone(wa),
    tempPassword: created ? input.tempPassword : null,
  };
}

/** Set a new temporary password; the owner must change it on next login. */
export async function resetOwnerPassword(input: {
  actorId: string;
  shopId: string;
  userId: string;
  tempPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.tempPassword.length < 8) {
    return { ok: false, error: "Temporary password must be at least 8 characters." };
  }
  const admin = createAdminClient();
  const { data: existing } = await admin.auth.admin.getUserById(input.userId);
  const { error } = await admin.auth.admin.updateUserById(input.userId, {
    password: input.tempPassword,
    user_metadata: { ...(existing.user?.user_metadata ?? {}), must_change_password: true },
  });
  if (error) return { ok: false, error: error.message };
  await logAudit({
    actorId: input.actorId,
    shopId: input.shopId,
    action: "owner.password_reset",
    entity: "user",
    entityId: input.userId,
  });
  return { ok: true };
}

/** Owner's last sign-in time (for the shop detail page). */
export async function getOwnerLastSignIn(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user?.last_sign_in_at ?? null;
}

/**
 * WhatsApp link to the OWNER's phone with their login details — the "send login" step.
 * No SMS provider needed; the admin taps Send.
 */
export function loginDetailsWhatsAppLink(opts: {
  ownerPhone: string;
  ownerName: string;
  shopName: string;
  appUrl: string;
  tempPassword?: string | null;
}): string | null {
  const wa = toWhatsAppNumber(opts.ownerPhone);
  if (!wa) return null;
  const lines = [
    `Assalam-o-Alaikum ${opts.ownerName}! Your Dukaan dashboard for ${opts.shopName} is ready.`,
    "",
    `Login: ${opts.appUrl}/auth/login`,
    `Phone: ${formatPhone(wa)}`,
  ];
  if (opts.tempPassword) {
    lines.push(`Temporary password: ${opts.tempPassword}`, "You'll be asked to set your own password the first time you log in.");
  }
  return waLink(wa, lines.join("\n"));
}
