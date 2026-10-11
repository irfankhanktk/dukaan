import { MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginDetailsWhatsAppLink } from "@/lib/owners";
import { formatPhone, timeAgo, toWhatsAppNumber } from "@/lib/format";
import { generateTempPassword } from "@/lib/login";
import { waLink } from "@/lib/whatsapp";
import type { Shop, ShopMemberRole } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChangeOwnerForm } from "./change-owner-form";
import { ResetPasswordButton } from "./reset-password-button";
import { getAppUrl, resolveActors } from "./server-utils";
import { formatDateTime } from "./shared";

export async function OwnerTab({ shop }: { shop: Shop }) {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("shop_members")
    .select("user_id, role, created_at")
    .eq("shop_id", shop.id)
    .order("created_at")
    .returns<{ user_id: string; role: ShopMemberRole; created_at: string }[]>();

  const ids = [...new Set([...(members ?? []).map((m) => m.user_id), ...(shop.owner_id ? [shop.owner_id] : [])])];
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, phone").in("id", ids)
    : { data: [] as { id: string; full_name: string | null; phone: string | null }[] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const contacts = await resolveActors(ids);

  // Owner's contact email + last sign-in come from the auth admin API (server only).
  let lastSignIn: string | null = null;
  let contactEmail: string | null = null;
  if (shop.owner_id) {
    try {
      const { data } = await createAdminClient().auth.admin.getUserById(shop.owner_id);
      lastSignIn = data.user?.last_sign_in_at ?? null;
      const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
      contactEmail = typeof meta.contact_email === "string" ? meta.contact_email : null;
    } catch {
      /* secret key missing in this environment */
    }
  }

  const owner = shop.owner_id ? profileById.get(shop.owner_id) : undefined;
  const ownerWa = owner?.phone ? toWhatsAppNumber(owner.phone) : null;
  const loginLink =
    owner?.phone && shop.owner_id
      ? loginDetailsWhatsAppLink({
          ownerPhone: owner.phone,
          ownerName: owner.full_name ?? "",
          shopName: shop.name,
          appUrl: await getAppUrl(),
        })
      : null;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <section className="rounded-card border border-border bg-surface-card p-4 md:p-5">
          <h2 className="font-bold">Owner</h2>
          {shop.owner_id ? (
            <>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Name" value={owner?.full_name ?? "—"} />
                <Row label="Login phone" value={owner?.phone ? formatPhone(owner.phone) : "—"} />
                <Row label="Email" value={contactEmail ?? "—"} />
                <Row label="Last login" value={lastSignIn ? `${timeAgo(lastSignIn)} (${formatDateTime(lastSignIn)})` : "Never"} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {ownerWa && (
                  <>
                    <Button asChild variant="secondary" size="sm">
                      <a href={`tel:+${ownerWa}`}>
                        <Phone /> Call
                      </a>
                    </Button>
                    <Button asChild variant="whatsapp" size="sm">
                      <a href={waLink(ownerWa, `Assalam-o-Alaikum ${owner?.full_name ?? ""}`.trim())} target="_blank" rel="noopener noreferrer">
                        <MessageCircle /> WhatsApp
                      </a>
                    </Button>
                  </>
                )}
                {loginLink && (
                  <Button asChild variant="secondary" size="sm">
                    <a href={loginLink} target="_blank" rel="noopener noreferrer">
                      <MessageCircle /> Send login on WhatsApp
                    </a>
                  </Button>
                )}
              </div>
              <div className="mt-3">
                <ResetPasswordButton shopId={shop.id} ownerName={owner?.full_name ?? ""} />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">No owner login yet. Create one below.</p>
          )}
        </section>

        <section className="rounded-card border border-border bg-surface-card p-4 md:p-5">
          <h2 className="font-bold">Members</h2>
          {(members ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-text-secondary">Nobody has access to this shop&apos;s dashboard yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {(members ?? []).map((m) => {
                const p = profileById.get(m.user_id);
                const c = contacts.get(m.user_id);
                return (
                  <li key={m.user_id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p?.full_name ?? "Unnamed user"}</p>
                      <p className="truncate text-xs text-text-secondary">
                        {c?.contact ?? (p?.phone ? formatPhone(p.phone) : "—")} · since {formatDateTime(m.created_at)}
                      </p>
                    </div>
                    <Badge variant={m.role === "owner" ? "brand" : "unconfirmed"} className="capitalize">
                      {m.role}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-card border border-border bg-surface-card p-4 md:p-5">
        <h2 className="font-bold">{shop.owner_id ? "Change owner" : "Create owner login"}</h2>
        <p className="mb-4 mt-1 text-sm text-text-secondary">
          Owners log in with their mobile number and a password. A new login gets the temporary password below and
          must set their own on first login. If the number already has a login, it is linked as-is.
        </p>
        <ChangeOwnerForm shopId={shop.id} defaultPassword={generateTempPassword()} hasOwner={!!shop.owner_id} />
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
