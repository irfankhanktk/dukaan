import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { Check, Circle, ExternalLink, Printer } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { formatPhone } from "@/lib/format";
import { fullWeek } from "@/lib/hours";
import { generateTempPassword } from "@/lib/login";
import { templateCounts } from "@/lib/menu-import";
import type { MenuTemplate, Shop, ShopRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { startViewAs } from "@/app/actions/view-as";
import { Button } from "@/components/ui/button";
import { getAppUrl } from "@/components/admin/wizard/app-url";
import { CopyButton } from "@/components/admin/wizard/copy-button";
import { Section, WizardHeader } from "@/components/admin/wizard/stepper";
import { StepDetails } from "@/components/admin/wizard/step-details";
import { StepOwner } from "@/components/admin/wizard/step-owner";
import { StepDelivery } from "@/components/admin/wizard/step-delivery";
import { StepMenu, type WizardCategory, type WizardProduct } from "@/components/admin/wizard/step-menu";
import { GoLiveForm } from "@/components/admin/wizard/step-review";

export const metadata = { title: "Shop setup" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ShopSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { supabase } = await requireSuperAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID_RE.test(id)) notFound();

  const { data: shop } = await supabase.from("shops").select("*").eq("id", id).maybeSingle<Shop>();
  if (!shop) notFound();

  const isLive = shop.status !== "setup";
  const maxStep = isLive ? 5 : Math.max(1, Math.min(5, shop.onboarding_step));
  const requested = Number.parseInt(sp.step ?? "", 10);
  const step = Number.isFinite(requested) ? Math.min(5, Math.max(1, requested)) : maxStep;
  if (step > maxStep) redirect(`/admin/shops/${shop.id}/setup?step=${maxStep}`);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <WizardHeader shopId={shop.id} shopName={shop.name} step={step} maxStep={maxStep} isLive={isLive} />
      <div className="mt-5">
        {step === 1 && (
          <StepDetails
            shopId={shop.id}
            requestId={null}
            isLive={isLive}
            defaults={{
              name: shop.name,
              slug: shop.slug,
              business_type: shop.business_type,
              whatsapp_number: formatPhone(shop.whatsapp_number),
              city: shop.city ?? "",
              area: shop.area ?? "",
              cover_color: shop.cover_color,
              logo_url: shop.logo_url,
            }}
          />
        )}
        {step === 2 && <OwnerStep shop={shop} />}
        {step === 3 && (
          <StepDelivery
            shopId={shop.id}
            defaults={{
              delivery_fee: shop.delivery_fee,
              delivery_areas: Array.isArray(shop.delivery_areas) ? shop.delivery_areas : [],
              min_order: shop.min_order,
              pickup_enabled: shop.pickup_enabled,
              prep_time: shop.opening_hours?.prep_time ?? "",
              days: fullWeek(shop.opening_hours),
            }}
          />
        )}
        {step === 4 && <MenuStep shop={shop} />}
        {step === 5 && <ReviewStep shop={shop} />}
      </div>
    </div>
  );
}

type Supa = Awaited<ReturnType<typeof requireSuperAdmin>>["supabase"];

async function getOwner(supabase: Supa, shopId: string) {
  const { data: member } = await supabase
    .from("shop_members")
    .select("user_id")
    .eq("shop_id", shopId)
    .eq("role", "owner")
    .order("created_at")
    .limit(1)
    .maybeSingle<{ user_id: string }>();
  if (!member) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", member.user_id)
    .maybeSingle<{ full_name: string | null; phone: string | null }>();
  return { userId: member.user_id, name: profile?.full_name ?? null, phone: profile?.phone ?? null };
}

async function OwnerStep({ shop }: { shop: Shop }) {
  const { supabase } = await requireSuperAdmin();
  const [owner, { data: request }] = await Promise.all([
    getOwner(supabase, shop.id),
    supabase
      .from("shop_requests")
      .select("owner_name, whatsapp_number")
      .eq("converted_shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Pick<ShopRequest, "owner_name" | "whatsapp_number">>(),
  ]);

  return (
    <StepOwner
      shopId={shop.id}
      existingOwner={owner ? { name: owner.name, phone: owner.phone } : null}
      prefill={{
        name: request?.owner_name ?? "",
        phone: request?.whatsapp_number ? formatPhone(request.whatsapp_number) : formatPhone(shop.whatsapp_number),
      }}
      defaultPassword={generateTempPassword()}
    />
  );
}

async function MenuStep({ shop }: { shop: Shop }) {
  const { supabase } = await requireSuperAdmin();
  const [{ data: templates }, { data: products }, { data: categories }] = await Promise.all([
    supabase.from("menu_templates").select("id, name, business_type, items").order("name").returns<MenuTemplate[]>(),
    supabase
      .from("products")
      .select("id, name, base_price, category_id, is_available, photo_url, unit")
      .eq("shop_id", shop.id)
      .order("sort_order")
      .order("name")
      .returns<WizardProduct[]>(),
    supabase
      .from("categories")
      .select("id, name")
      .eq("shop_id", shop.id)
      .order("sort_order")
      .returns<WizardCategory[]>(),
  ]);

  const openEditor = startViewAs.bind(null, shop.id, "/dashboard/menu");

  return (
    <StepMenu
      shopId={shop.id}
      businessType={shop.business_type}
      templates={(templates ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        business_type: t.business_type,
        ...templateCounts(t),
        categoryNames: (t.items?.categories ?? []).map((c) => c.name),
      }))}
      products={products ?? []}
      categories={categories ?? []}
      fullEditor={
        <form action={openEditor}>
          <Button type="submit" variant="link" size="sm" className="px-0">
            Full product editor (view as shopkeeper) <ExternalLink />
          </Button>
        </form>
      }
    />
  );
}

async function ReviewStep({ shop }: { shop: Shop }) {
  const { supabase } = await requireSuperAdmin();
  const [owner, { count: productCount }, { count: withPhotos }, appUrl] = await Promise.all([
    getOwner(supabase, shop.id),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .not("photo_url", "is", null),
    getAppUrl(),
  ]);
  const products = productCount ?? 0;
  const photos = withPhotos ?? 0;
  const shopUrl = `${appUrl}/${shop.slug}`;
  const qrSvg = await QRCode.toString(shopUrl, { type: "svg", margin: 1, color: { dark: "#1F1D1A", light: "#FFFFFF" } });
  const hoursSet = !!shop.opening_hours?.days;

  const checklist = [
    { label: "Shop details", done: true, step: 1 },
    { label: "Owner account", done: !!owner, step: 2, detail: owner ? `${owner.name ?? "Owner"} · ${owner.phone ? formatPhone(owner.phone) : ""}` : undefined },
    { label: "Delivery & hours", done: hoursSet, step: 3 },
    { label: "Menu has at least 1 product", done: products > 0, step: 4, detail: `${products} products` },
    { label: `Photos ${photos} of ${products}`, done: products > 0 && photos === products, step: 4 },
    { label: "QR code placed in the shop", done: !!shop.qr_placed_at, step: null },
  ];
  const blockers = [
    ...(!owner ? ["Create the owner's login (step 2)."] : []),
    ...(products === 0 ? ["Add at least one product (step 4)."] : []),
  ];
  const warnings = checklist.filter((c) => !c.done && c.step !== 2 && !c.label.startsWith("Menu")).map((c) => c.label);

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-6">
      <div className="space-y-4">
        <Section title="Checklist">
          <ul className="divide-y divide-border">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-3 py-3">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    c.done ? "bg-status-delivered-bg text-status-delivered-fg" : "bg-surface-bg text-text-secondary",
                  )}
                >
                  {c.done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Circle className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium", !c.done && "text-text-secondary")}>{c.label}</p>
                  {c.detail && <p className="truncate text-xs text-text-secondary">{c.detail}</p>}
                </div>
                {!c.done && c.step && (
                  <Link
                    href={`/admin/shops/${shop.id}/setup?step=${c.step}`}
                    className="text-sm font-semibold text-brand-primary hover:underline"
                  >
                    Fix
                  </Link>
                )}
                {!c.done && !c.step && (
                  <Link href={`/admin/shops/${shop.id}/qr`} className="text-sm font-semibold text-brand-primary hover:underline">
                    Print
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Shop link" description="Share this link or the QR code with customers.">
          <p className="break-all rounded-xl bg-surface-bg px-4 py-3 font-medium">{shopUrl}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={shopUrl} label="Copy link" size="sm" />
            <Button asChild variant="secondary" size="sm">
              <a href={`/${shop.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Open shop page
              </a>
            </Button>
          </div>
          {!isPublic(shop) && (
            <p className="mt-2 text-xs text-text-secondary">
              The shop page becomes visible to customers once the shop is live.
            </p>
          )}
        </Section>

        <GoLiveForm
          shopId={shop.id}
          currentStatus={shop.status}
          defaultFee={shop.monthly_fee}
          defaultPaidUntil={shop.paid_until}
          blockers={blockers}
          warnings={warnings}
        />
      </div>

      <aside className="mt-4 md:sticky md:top-6 md:mt-0">
        <Section title="QR code">
          <div
            className="mx-auto aspect-square w-full max-w-[240px] [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <Button asChild variant="secondary" className="mt-4 w-full">
            <Link href={`/admin/shops/${shop.id}/qr`}>
              <Printer /> Print QR poster
            </Link>
          </Button>
        </Section>
      </aside>
    </div>
  );
}

function isPublic(shop: Shop) {
  return shop.status === "trial" || shop.status === "active" || shop.status === "payment_due";
}
