import { requireSuperAdmin } from "@/lib/auth";
import { formatPhone } from "@/lib/format";
import type { ShopRequest } from "@/lib/types";
import { WizardHeader } from "@/components/admin/wizard/stepper";
import { StepDetails, type DetailsDefaults } from "@/components/admin/wizard/step-details";
import { slugify } from "@/lib/menu-import";

export const metadata = { title: "Register new shop" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewShopPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>;
}) {
  const { supabase } = await requireSuperAdmin();
  const { request: requestId } = await searchParams;

  let request: ShopRequest | null = null;
  if (requestId && UUID_RE.test(requestId)) {
    const { data } = await supabase.from("shop_requests").select("*").eq("id", requestId).maybeSingle<ShopRequest>();
    request = data;
  }

  const defaults: DetailsDefaults = {
    name: request?.shop_name ?? "",
    slug: request ? slugify(request.shop_name) : "",
    business_type: request?.business_type ?? "bakery",
    whatsapp_number: request ? formatPhone(request.whatsapp_number) : "",
    city: request?.city ?? "",
    area: request?.area ?? "",
    cover_color: "#0F5C4A",
    logo_url: null,
  };

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <WizardHeader shopId={null} shopName={null} step={1} maxStep={1} />
      {request && (
        <p className="mt-4 rounded-xl bg-brand-primary-soft px-4 py-3 text-sm text-brand-primary">
          Prefilled from {request.owner_name}&apos;s request for <strong>{request.shop_name}</strong>
          {request.converted_shop_id ? " (already converted once — this will create another shop)" : ""}. The
          request is marked registered when you continue.
        </p>
      )}
      <div className="mt-5">
        <StepDetails shopId={null} requestId={request?.id ?? null} defaults={defaults} />
      </div>
    </div>
  );
}
