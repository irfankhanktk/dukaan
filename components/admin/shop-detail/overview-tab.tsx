import Link from "next/link";
import { Check, ChevronRight, Circle, MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOwnerLastSignIn, loginDetailsWhatsAppLink } from "@/lib/owners";
import { formatPhone, formatRs, startOfPkDay, timeAgo, toWhatsAppNumber } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import type { Shop } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResetPasswordButton } from "./reset-password-button";
import { StatusActionButton } from "./status-action-button";
import { getAppUrl } from "./server-utils";
import { SHOP_STATUS_LABELS, SHOP_STATUS_VARIANT, formatDay, shopTabHref } from "./shared";

export async function OverviewTab({ shop }: { shop: Shop }) {
  const supabase = await createClient();
  const since = startOfPkDay(29);

  const [ordersRes, productsRes, photosRes, anyOrderRes, ownerRes] = await Promise.all([
    supabase
      .from("orders")
      .select("total, status")
      .eq("shop_id", shop.id)
      .gte("created_at", since)
      .limit(10000),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .not("photo_url", "is", null),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
    shop.owner_id
      ? supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", shop.owner_id)
          .maybeSingle<{ full_name: string | null; phone: string | null }>()
      : Promise.resolve({ data: null }),
  ]);

  const orders = (ordersRes.data ?? []).filter((o) => o.status !== "rejected");
  const sales30 = orders.reduce((s, o) => s + (o.total as number), 0);
  const productCount = productsRes.count ?? 0;
  const photoCount = photosRes.count ?? 0;
  const hasOrder = (anyOrderRes.count ?? 0) > 0;
  const owner = ownerRes.data;

  let lastLogin: string | null = null;
  if (shop.owner_id) {
    try {
      lastLogin = await getOwnerLastSignIn(shop.owner_id);
    } catch {
      lastLogin = null;
    }
  }

  const appUrl = await getAppUrl();
  const ownerWa = owner?.phone ? toWhatsAppNumber(owner.phone) : null;
  const loginLink =
    owner?.phone && shop.owner_id
      ? loginDetailsWhatsAppLink({
          ownerPhone: owner.phone,
          ownerName: owner.full_name ?? "",
          shopName: shop.name,
          appUrl,
        })
      : null;

  const setupHref = (step: number) => `/admin/shops/${shop.id}/setup?step=${step}`;
  const days = shop.opening_hours?.days ?? {};
  const checklist = [
    {
      label: "Shop details",
      done: !!(shop.name && shop.slug && shop.whatsapp_number && (shop.city || shop.area)),
      href: setupHref(1),
    },
    { label: "Owner account", done: !!shop.owner_id, href: setupHref(2) },
    {
      label: "Delivery & hours",
      done: Object.keys(days).length > 0 || shop.onboarding_step > 3,
      href: setupHref(3),
    },
    {
      label: productCount > 0 ? `Menu (${productCount} product${productCount === 1 ? "" : "s"})` : "Menu (at least 1 product)",
      done: productCount > 0,
      href: setupHref(4),
    },
    {
      label: `Photos ${photoCount} of ${productCount}`,
      done: productCount > 0 && photoCount >= productCount,
      href: `/admin/shops/${shop.id}?tab=menu`,
    },
    { label: "QR code placed", done: !!shop.qr_placed_at, href: `/admin/shops/${shop.id}/qr` },
    { label: "First order received", done: hasOrder, href: shopTabHref(shop.id, "orders") },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Stat label="Orders (30 days)" value={String(orders.length)} />
        <Stat label="Sales (30 days)" value={formatRs(sales30)} />
        <Stat label="Products" value={String(productCount)} sub={`${photoCount} with photos`} />
        <Stat
          label="Owner's last login"
          value={lastLogin ? timeAgo(lastLogin) : shop.owner_id ? "Never" : "No owner"}
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {/* Setup checklist */}
        <section className="rounded-card border border-border bg-surface-card p-4 md:row-span-2 md:p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Setup checklist</h2>
            <span className="text-sm text-text-secondary">
              {doneCount} of {checklist.length}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-bg">
            <div
              className="h-full rounded-full bg-brand-primary"
              style={{ width: `${Math.round((doneCount / checklist.length) * 100)}%` }}
            />
          </div>
          <ul className="mt-3 divide-y divide-border">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center gap-3 py-3 text-sm hover:text-brand-primary">
                  {c.done ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-text-inverse">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  ) : (
                    <Circle className="h-6 w-6 text-border" strokeWidth={1.5} />
                  )}
                  <span className={cn("flex-1", c.done ? "text-text-primary" : "font-medium")}>{c.label}</span>
                  <ChevronRight className="h-4 w-4 text-text-secondary" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Owner card */}
        <section className="rounded-card border border-border bg-surface-card p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Owner</h2>
            <Link href={shopTabHref(shop.id, "owner")} className="text-sm font-medium text-brand-primary hover:underline">
              Manage
            </Link>
          </div>
          {shop.owner_id ? (
            <>
              <p className="mt-2 text-base font-semibold">{owner?.full_name ?? "Unnamed owner"}</p>
              <p className="text-sm text-text-secondary">{owner?.phone ? formatPhone(owner.phone) : "No phone saved"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
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
                      <MessageCircle /> Resend login link
                    </a>
                  </Button>
                )}
              </div>
              <div className="mt-3">
                <ResetPasswordButton shopId={shop.id} ownerName={owner?.full_name ?? ""} />
              </div>
            </>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-text-secondary">No owner login yet.</p>
              <Button asChild size="sm" className="mt-3">
                <Link href={shopTabHref(shop.id, "owner")}>Create owner login</Link>
              </Button>
            </div>
          )}
        </section>

        {/* Subscription card */}
        <section className="rounded-card border border-border bg-surface-card p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Subscription</h2>
            <Badge variant={SHOP_STATUS_VARIANT[shop.status]}>{SHOP_STATUS_LABELS[shop.status]}</Badge>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-text-secondary">Plan</dt>
              <dd className="font-semibold capitalize">{shop.plan}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-secondary">Monthly fee</dt>
              <dd className="font-semibold">{formatRs(shop.monthly_fee)}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-secondary">Paid until</dt>
              <dd className="font-semibold">{formatDay(shop.paid_until)}</dd>
            </div>
          </dl>
          <Button asChild size="sm" className="mt-4">
            <Link href={`${shopTabHref(shop.id, "billing")}#record-payment`}>Record payment</Link>
          </Button>
        </section>
      </div>

      {/* Danger zone */}
      <section className="rounded-card border border-feedback-danger/30 bg-surface-card p-4 md:p-5">
        <h2 className="font-bold text-feedback-danger">Danger zone</h2>
        {shop.status === "suspended" ? (
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-text-secondary">
              This shop is suspended. Customers see &ldquo;This shop is not taking orders right now&rdquo; and the
              owner sees a notice on their dashboard.
            </p>
            <StatusActionButton
              shopId={shop.id}
              status="active"
              label="Reactivate shop"
              variant="primary"
              confirmText={`Reactivate ${shop.name}? Customers will be able to order again.`}
            />
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-text-secondary">
              Suspending stops new orders. The shop page will say it is not taking orders right now; the owner can
              still log in but sees a notice.
            </p>
            <StatusActionButton
              shopId={shop.id}
              status="suspended"
              label="Suspend shop"
              variant="danger"
              confirmText={`Suspend ${shop.name}? Customers won't be able to place orders until you reactivate it.`}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card border border-border bg-surface-card px-4 py-3.5 md:px-5 md:py-4">
      <p className="text-xs text-text-secondary md:text-sm">{label}</p>
      <p className="mt-1 text-xl font-bold md:text-2xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}
