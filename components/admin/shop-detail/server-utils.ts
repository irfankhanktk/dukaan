import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatPhone } from "@/lib/format";
import { isPhoneLoginEmail } from "@/lib/login";

/** App origin for links sent to owners, from the request (works on Vercel previews too). */
export async function getAppUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export type ActorInfo = { name: string | null; contact: string | null };

/**
 * Names (profiles) and emails/phones (auth users) for a set of user ids.
 * Uses the admin API only to read emails — call only after requireSuperAdmin().
 */
export async function resolveActors(ids: (string | null | undefined)[]): Promise<Map<string, ActorInfo>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  const map = new Map<string, ActorInfo>();
  if (unique.length === 0) return map;

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .in("id", unique);
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  let admin: ReturnType<typeof createAdminClient> | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  await Promise.all(
    unique.map(async (id) => {
      const p = byId.get(id) as { full_name: string | null; phone: string | null } | undefined;
      let contact: string | null = p?.phone ? formatPhone(p.phone) : null;
      if (admin) {
        const { data } = await admin.auth.admin.getUserById(id);
        const email = data.user?.email ?? null;
        if (email && !isPhoneLoginEmail(email)) contact = email;
      }
      map.set(id, { name: p?.full_name ?? null, contact });
    }),
  );
  return map;
}
