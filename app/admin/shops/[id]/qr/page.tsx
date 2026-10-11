import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { Shop } from "@/lib/types";
import { ShopAvatar } from "@/components/ui/product-image";
import { WhatsAppIcon } from "@/components/shop/whatsapp-icon";
import { getAppUrl } from "@/components/admin/wizard/app-url";
import { QrActions } from "@/components/admin/wizard/qr-actions";

export const metadata = { title: "QR poster" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function QrPosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireSuperAdmin();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const { data: shop } = await supabase
    .from("shops")
    .select("id, slug, name, area, city, logo_url, cover_color, status, qr_placed_at")
    .eq("id", id)
    .maybeSingle<Pick<Shop, "id" | "slug" | "name" | "area" | "city" | "logo_url" | "cover_color" | "status" | "qr_placed_at">>();
  if (!shop) notFound();

  const appUrl = await getAppUrl();
  const shopUrl = `${appUrl}/${shop.slug}`;
  const displayUrl = shopUrl.replace(/^https?:\/\//, "");
  const qrSvg = await QRCode.toString(shopUrl, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1F1D1A", light: "#FFFFFF" },
  });

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8 print:max-w-none print:p-0">
      <div className="mb-5 space-y-3 print:hidden">
        <Link
          href={shop.status === "setup" ? `/admin/shops/${shop.id}/setup?step=5` : `/admin/shops/${shop.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-brand-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold">QR poster · {shop.name}</h1>
        <p className="text-sm text-text-secondary">
          Print it, or choose &quot;Save as PDF&quot; in the print dialog. Place it at the counter or on the door.
          {shop.qr_placed_at && ` Marked as placed on ${formatDate(shop.qr_placed_at)}.`}
        </p>
        <QrActions shopId={shop.id} placedAt={shop.qr_placed_at} />
      </div>

      {/* The poster */}
      <article
        className="mx-auto flex w-full max-w-[148mm] flex-col items-center overflow-hidden rounded-card border border-border bg-surface-card text-center print:max-w-none print:rounded-none print:border-0"
        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        <div className="flex w-full flex-col items-center gap-3 px-6 pb-6 pt-8" style={{ backgroundColor: shop.cover_color }}>
          <ShopAvatar name={shop.name} logoUrl={shop.logo_url} className="h-20 w-20 border-4 border-white text-2xl" />
          <h2 className="text-3xl font-extrabold leading-tight text-text-inverse">{shop.name}</h2>
          {(shop.area || shop.city) && (
            <p className="text-sm text-text-inverse/85">{[shop.area, shop.city].filter(Boolean).join(", ")}</p>
          )}
        </div>

        <div className="flex w-full flex-col items-center px-6 py-8">
          <p className="flex items-center gap-2 text-2xl font-bold text-brand-whatsapp">
            <WhatsAppIcon className="h-7 w-7" /> Order on WhatsApp
          </p>
          <p className="mt-1 text-base text-text-secondary">Scan to see our menu</p>

          <div
            className="mt-6 aspect-square w-[70%] max-w-[90mm] rounded-2xl border border-border bg-white p-4 [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          <p dir="rtl" lang="ur" className="mt-6 font-urdu text-xl leading-[2.2]">
            مینیو دیکھنے کے لیے اسکین کریں اور واٹس ایپ پر آرڈر کریں
          </p>
          <p className="mt-4 break-all rounded-full bg-surface-bg px-4 py-1.5 text-sm font-semibold">{displayUrl}</p>
        </div>
      </article>
    </div>
  );
}
