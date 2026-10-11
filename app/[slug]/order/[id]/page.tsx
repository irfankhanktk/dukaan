import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { OrderSentActions } from "@/components/shop/order-sent-actions";
import { ShopAvatar } from "@/components/ui/product-image";
import { formatPhone, formatQty, formatRs } from "@/lib/format";
import { translate } from "@/lib/i18n";
import { getLang, getPublicOrder, orderWhatsAppUrl } from "../../data";

type Props = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ wa?: string }>;
};

export const metadata: Metadata = {
  title: "Order sent",
  robots: { index: false, follow: false },
};

export default async function OrderSentPage({ params, searchParams }: Props) {
  const [{ slug, id }, { wa }, lang] = await Promise.all([params, searchParams, getLang()]);
  const order = await getPublicOrder(id);
  if (!order || order.shop.slug !== slug) notFound();

  const t = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) =>
    translate(lang, key, vars);
  const waUrl = orderWhatsAppUrl(order);

  return (
    <div className="mx-auto max-w-xl px-4 pb-12 pt-8 md:pt-14">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-status-delivered-bg">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-whatsapp text-text-inverse">
            <Check className="h-8 w-8" strokeWidth={3} />
          </div>
        </div>
        <h1 className="mt-5 text-2xl font-extrabold md:text-3xl">
          {t("orderSaved", { n: order.order_number })}
        </h1>
        <p className="mt-2 max-w-sm text-text-secondary">
          {t("orderSentBody", { shop: order.shop.name })}
        </p>
      </div>

      <div className="mt-6">
        <OrderSentActions
          waUrl={waUrl}
          menuHref={`/${order.shop.slug}`}
          autoOpen={wa === "1"}
        />
        <p className="mt-3 text-center text-xs text-text-secondary">{t("orderSentHint")}</p>
      </div>

      <section
        aria-label={t("orderSummary")}
        className="mt-8 rounded-card border border-border bg-surface-card p-4 md:p-6"
      >
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <ShopAvatar name={order.shop.name} logoUrl={order.shop.logo_url} className="h-11 w-11" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold" dir="auto">
              {order.shop.name}
            </p>
            <p className="text-sm text-text-secondary">
              {t("orderNumber", { n: order.order_number })}
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-3 py-4">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold" dir="auto">
                  <span className="text-text-secondary">{formatQty(item.quantity, item.unit ?? "piece")}</span>{" "}
                  {item.product_name}
                </p>
                {item.options.length > 0 && (
                  <p className="mt-0.5 text-xs text-text-secondary" dir="auto">
                    {item.options.map((o) => o.choice).join(", ")}
                  </p>
                )}
                {item.note && (
                  <p className="mt-0.5 text-xs italic text-text-secondary" dir="auto">
                    {item.note}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{formatRs(item.line_total)}</span>
            </li>
          ))}
        </ul>

        <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-secondary">{t("subtotal")}</dt>
            <dd className="tabular-nums">{formatRs(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">
              {order.fulfillment === "delivery" ? t("delivery") : t("pickupFromShop")}
            </dt>
            <dd className="tabular-nums">{formatRs(order.delivery_fee)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-base">
            <dt className="font-bold">{t("total")}</dt>
            <dd className="font-extrabold tabular-nums text-brand-primary">{formatRs(order.total)}</dd>
          </div>
        </dl>

        <dl className="mt-4 grid gap-2 rounded-xl bg-surface-bg p-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-text-secondary">{t("name")}</dt>
            <dd className="text-end font-medium" dir="auto">
              {order.customer_name}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-secondary">{t("phone")}</dt>
            <dd className="font-medium" dir="ltr">
              {formatPhone(order.customer_phone)}
            </dd>
          </div>
          {order.fulfillment === "delivery" && order.delivery_area && (
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-text-secondary">{t("area")}</dt>
              <dd className="text-end font-medium" dir="auto">
                {order.delivery_area}
              </dd>
            </div>
          )}
          {order.fulfillment === "delivery" && order.address && (
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-text-secondary">{t("deliverTo")}</dt>
              <dd className="text-end font-medium" dir="auto">
                {order.address}
              </dd>
            </div>
          )}
          {order.lat != null && order.lng != null && (
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">{t("location")}</dt>
              <dd className="font-medium text-brand-primary">{t("locationAdded")}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-text-secondary">{t("payment")}</dt>
            <dd className="font-medium">{t("cashOnDelivery")}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
