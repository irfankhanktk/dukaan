import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { PlatformRole, Shop, ShopMemberRole } from "./types";

/** Cookie holding the shop a super admin is viewing "as shopkeeper". Only honoured for super admins. */
export const VIEW_AS_COOKIE = "dk_view_shop";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Signed-in user (or null). Cached per request. */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, platform_role")
    .eq("id", claims.sub)
    .maybeSingle<{ full_name: string | null; phone: string | null; platform_role: PlatformRole | null }>();
  return {
    supabase,
    userId: claims.sub as string,
    email: (claims.email as string | undefined) ?? "",
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    platformRole: profile?.platform_role ?? null,
    isSuperAdmin: profile?.platform_role === "super_admin",
    mustChangePassword: meta.must_change_password === true,
    aal: (claims.aal as string | undefined) ?? "aal1",
  };
});

/** Returns the signed-in user, or redirects to login. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  return user;
}

/**
 * Guard for /admin. Server-side role check (hiding buttons is not security).
 * Super admins who enrolled a TOTP factor must complete it (aal2) before entering.
 */
export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!user.isSuperAdmin) redirect("/");
  const { data: aal } = await user.supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect("/auth/mfa");
  }
  return { ...user, mfaEnrolled: aal?.nextLevel === "aal2" };
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export type ShopContext = SessionUser & {
  shop: Shop;
  /** 'member' = the shop's own owner/staff; 'admin' = super admin in "View as shopkeeper" mode */
  mode: "member" | "admin";
  role: ShopMemberRole | "super_admin";
};

/**
 * The shop the current dashboard request is about:
 * - super admin with a view-as cookie → that shop (mode 'admin')
 * - otherwise the user's first shop membership (mode 'member')
 * Returns shop = null when there is none.
 */
export const getShopContext = cache(async () => {
  const user = await requireUser();

  if (user.isSuperAdmin) {
    const viewId = (await cookies()).get(VIEW_AS_COOKIE)?.value;
    if (viewId && UUID_RE.test(viewId)) {
      const { data: shop } = await user.supabase
        .from("shops")
        .select("*")
        .eq("id", viewId)
        .maybeSingle<Shop>();
      if (shop) return { ...user, shop, mode: "admin" as const, role: "super_admin" as const };
    }
  }

  const { data: membership } = await user.supabase
    .from("shop_members")
    .select("role, shops(*)")
    .eq("user_id", user.userId)
    .order("created_at")
    .limit(1)
    .maybeSingle<{ role: ShopMemberRole; shops: Shop | null }>();

  if (membership?.shops) {
    return { ...user, shop: membership.shops, mode: "member" as const, role: membership.role };
  }
  return { ...user, shop: null, mode: "member" as const, role: null };
});

/**
 * Guard for /dashboard pages and actions. Redirects when there is no shop, and sends
 * owners with a temporary password to change it first.
 */
export async function requireShopContext(): Promise<ShopContext> {
  const ctx = await getShopContext();
  if (!ctx.shop) {
    if (ctx.isSuperAdmin) redirect("/admin/shops");
    redirect("/dashboard/no-shop");
  }
  if (ctx.mode === "member" && ctx.mustChangePassword) {
    redirect("/auth/update-password?first=1");
  }
  return ctx as ShopContext;
}

/** Owner-level actions (menu, settings): owners and super admins, not staff. */
export async function requireShopOwnerContext(): Promise<ShopContext> {
  const ctx = await requireShopContext();
  if (ctx.role === "staff") redirect("/dashboard");
  return ctx;
}
