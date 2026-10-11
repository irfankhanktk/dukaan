"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Bike,
  Check,
  Loader2,
  LocateFixed,
  MapPin,
  Store,
  X,
} from "lucide-react";
import { placeOrder } from "@/app/[slug]/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { formatRs, toWhatsAppNumber } from "@/lib/format";
import type { Fulfillment, PublicShop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCart } from "./cart";
import { CartLines } from "./cart-lines";
import { useLang } from "./language";
import { WhatsAppIcon } from "./whatsapp-icon";

const CUSTOMER_KEY = "dukaan:customer";

type SavedCustomer = { name?: string; phone?: string; address?: string; area?: string };


export function CheckoutView({ shop }: { shop: PublicShop }) {
  const { t, lang } = useLang();
  const cart = useCart();
  const router = useRouter();
  const formId = useId();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locState, setLocState] = useState<"idle" | "loading" | "error">("idle");
  const [errors, setErrors] = useState<{ name?: string; phone?: string; area?: string; address?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Prefill details from the last order on this device.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOMER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedCustomer;
      if (saved.name) setName(saved.name);
      if (saved.phone) setPhone(saved.phone);
      if (saved.address) setAddress(saved.address);
      if (saved.area) setArea(saved.area);
    } catch {
      /* ignore */
    }
  }, []);

  // Per-area delivery fees when the shop lists areas; otherwise one flat fee.
  const areas = shop.delivery_areas;
  const hasAreas = areas.length > 0;
  const pickupEnabled = shop.pickup_enabled;
  const selectedArea = hasAreas ? areas.find((a) => a.name === area) : undefined;
  const deliveryFee =
    fulfillment === "delivery" ? (hasAreas ? (selectedArea?.fee ?? 0) : shop.delivery_fee) : 0;
  const subtotal = cart.subtotal;
  const total = subtotal + deliveryFee;
  const belowMin = shop.min_order > 0 && subtotal < shop.min_order;
  const empty = cart.hydrated && cart.lines.length === 0;
  const canSubmit = shop.is_open && !belowMin && cart.lines.length > 0 && !pending && !done;

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocState("error");
      return;
    }
    setLocState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({
          lat: Math.round(pos.coords.latitude * 1e6) / 1e6,
          lng: Math.round(pos.coords.longitude * 1e6) / 1e6,
        });
        setLocState("idle");
      },
      () => setLocState("error"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = t("errName");
    if (!toWhatsAppNumber(phone)) e.phone = t("errPhone");
    if (fulfillment === "delivery" && hasAreas && !selectedArea) e.area = t("errArea");
    if (fulfillment === "delivery" && !address.trim()) e.address = t("errAddress");
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) document.getElementById(`${formId}-${first}`)?.focus();
    return Object.keys(e).length === 0;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!canSubmit || !validate()) return;

    // Desktop: open the WhatsApp tab now, inside the click, so popup blockers allow it;
    // it is pointed at wa.me once the order is saved.
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    let popup: Window | null = null;
    if (isDesktop) {
      popup = window.open("", "_blank");
      if (popup) {
        try {
          popup.opener = null;
          popup.document.title = "WhatsApp…";
        } catch {
          /* ignore */
        }
      }
    }

    startTransition(async () => {
      let result: Awaited<ReturnType<typeof placeOrder>>;
      try {
        result = await placeOrder({
          slug: shop.slug,
          lang,
          customer_name: name,
          customer_phone: phone,
          fulfillment,
          delivery_area: fulfillment === "delivery" && selectedArea ? selectedArea.name : undefined,
          address: fulfillment === "delivery" ? address : undefined,
          lat: fulfillment === "delivery" ? (loc?.lat ?? null) : null,
          lng: fulfillment === "delivery" ? (loc?.lng ?? null) : null,
          note: note || undefined,
          items: cart.lines.map((l) => ({
            product_id: l.product_id,
            quantity: l.quantity,
            option_value_ids: l.option_value_ids,
            texts: l.texts,
            note: l.note,
          })),
        });
      } catch {
        result = { ok: false, error: t("errGeneric") };
      }

      if (!result.ok) {
        popup?.close();
        if (result.field) {
          const key =
            result.field === "customer_name"
              ? "name"
              : result.field === "customer_phone"
                ? "phone"
                : result.field === "delivery_area"
                  ? "area"
                  : "address";
          setErrors({ [key]: result.error });
          document.getElementById(`${formId}-${key}`)?.focus();
        } else {
          setFormError(result.error);
        }
        return;
      }

      // The order is saved. Remember details, clear the cart, then hand off to WhatsApp.
      setDone(true);
      try {
        window.localStorage.setItem(
          CUSTOMER_KEY,
          JSON.stringify({ name: name.trim(), phone: phone.trim(), address: address.trim(), area: selectedArea?.name }),
        );
      } catch {
        /* ignore */
      }
      cart.clear();

      const orderUrl = `/${shop.slug}/order/${result.orderId}`;
      if (popup && result.waUrl) {
        popup.location.href = result.waUrl;
        router.replace(orderUrl);
      } else {
        popup?.close();
        // Mobile: the order page opens WhatsApp itself once it has loaded (?wa=1),
        // so "back" from WhatsApp lands on the order page, not an empty checkout.
        router.replace(result.waUrl ? `${orderUrl}?wa=1` : orderUrl);
      }
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-36 md:px-6 md:pb-12">
      <div className="flex items-center gap-3 py-4 md:py-6">
        <Link
          href={`/${shop.slug}`}
          aria-label={t("backToMenu")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-card hover:bg-brand-primary-soft"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold md:text-2xl">{t("checkout")}</h1>
          <p className="truncate text-sm text-text-secondary" dir="auto">
            {shop.name}
          </p>
        </div>
      </div>

      {!shop.is_open && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2 rounded-card bg-status-rejected-bg px-4 py-3 text-sm font-medium text-status-rejected-fg"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {t("shopClosedCheckout")}
        </div>
      )}

      {empty && !done ? (
        <div className="rounded-card border border-border bg-surface-card px-6 py-12 text-center">
          <p className="text-lg font-bold">{t("cartEmpty")}</p>
          <p className="mt-1 text-sm text-text-secondary">{t("cartEmptyHint")}</p>
          <Link href={`/${shop.slug}`} className={cn(buttonVariants(), "mt-5")}>
            {t("backToMenu")}
          </Link>
        </div>
      ) : (
        <form
          id={formId}
          noValidate
          onSubmit={onSubmit}
          className="grid gap-4 md:grid-cols-[minmax(0,1fr)_380px] md:items-start md:gap-6"
        >
          <div className="flex flex-col gap-4">
            {/* Details */}
            <section className="rounded-card border border-border bg-surface-card p-4 md:p-6">
              <h2 className="mb-4 text-base font-bold">{t("yourDetails")}</h2>
              <div className="flex flex-col gap-4">
                <Field label={t("name")} htmlFor={`${formId}-name`} error={errors.name}>
                  <Input
                    id={`${formId}-name`}
                    autoComplete="name"
                    placeholder={t("namePlaceholder")}
                    maxLength={100}
                    value={name}
                    aria-invalid={!!errors.name || undefined}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field
                  label={t("phone")}
                  htmlFor={`${formId}-phone`}
                  error={errors.phone}
                  hint={t("phoneHint")}
                >
                  <Input
                    id={`${formId}-phone`}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder="0300 1234567"
                    maxLength={20}
                    value={phone}
                    aria-invalid={!!errors.phone || undefined}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rtl:text-right"
                  />
                </Field>
              </div>
            </section>

            {/* Delivery / pickup */}
            <section className="rounded-card border border-border bg-surface-card p-4 md:p-6">
              <h2 className="mb-4 text-base font-bold">{t("howToGet")}</h2>
              <div
                role="radiogroup"
                aria-label={t("howToGet")}
                className={cn("grid gap-1 rounded-btn bg-surface-bg p-1", pickupEnabled ? "grid-cols-2" : "grid-cols-1")}
              >
                {(
                  [
                    { v: "delivery", label: t("delivery"), icon: <Bike className="h-4 w-4" /> },
                    { v: "pickup", label: t("pickup"), icon: <Store className="h-4 w-4" /> },
                  ] as const
                )
                  .filter((o) => o.v === "delivery" || pickupEnabled)
                  .map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    role="radio"
                    aria-checked={fulfillment === o.v}
                    onClick={() => setFulfillment(o.v)}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors",
                      fulfillment === o.v
                        ? "bg-surface-card text-brand-primary shadow-sm ring-1 ring-border"
                        : "text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {o.icon}
                    {o.label}
                  </button>
                ))}
              </div>

              {fulfillment === "delivery" && (
                <div className="mt-4 flex flex-col gap-3">
                  {hasAreas && (
                    <Field label={t("deliveryArea")} htmlFor={`${formId}-area`} error={errors.area}>
                      <Select
                        id={`${formId}-area`}
                        value={selectedArea ? area : ""}
                        required
                        aria-invalid={!!errors.area || undefined}
                        onChange={(e) => setArea(e.target.value)}
                      >
                        <option value="" disabled>
                          {t("chooseArea")}
                        </option>
                        {areas.map((a) => (
                          <option key={a.name} value={a.name}>
                            {a.fee > 0
                              ? t("areaFee", { area: a.name, amount: formatRs(a.fee) })
                              : t("areaFree", { area: a.name })}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  <Field label={t("address")} htmlFor={`${formId}-address`} error={errors.address}>
                    <Textarea
                      id={`${formId}-address`}
                      autoComplete="street-address"
                      placeholder={t("addressPlaceholder")}
                      maxLength={500}
                      rows={2}
                      className="min-h-[72px]"
                      value={address}
                      aria-invalid={!!errors.address || undefined}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </Field>
                  {loc ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-brand-primary-soft px-3 py-2.5 text-sm font-semibold text-brand-primary">
                      <span className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        {t("locationAdded")}
                      </span>
                      <button
                        type="button"
                        aria-label={t("removeLocation")}
                        onClick={() => setLoc(null)}
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/60"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={requestLocation}
                      disabled={locState === "loading"}
                      className="self-start"
                    >
                      {locState === "loading" ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <LocateFixed />
                      )}
                      {locState === "loading" ? t("locating") : t("useLocation")}
                    </Button>
                  )}
                  {locState === "error" && (
                    <p className="text-xs text-feedback-danger" role="alert">
                      {t("locationError")}
                    </p>
                  )}
                </div>
              )}
              {fulfillment === "pickup" && (
                <p className="mt-4 flex items-start gap-2 text-sm text-text-secondary">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span dir="auto">
                    {t("pickupFromShop")}
                    {shop.area ? ` — ${shop.area}` : ""}
                  </span>
                </p>
              )}

              <Field label={t("orderNote")} htmlFor={`${formId}-note`} className="mt-4">
                <Textarea
                  id={`${formId}-note`}
                  placeholder={t("orderNotePlaceholder")}
                  maxLength={500}
                  rows={2}
                  className="min-h-[64px]"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </section>

            {/* Payment */}
            <section className="rounded-card border border-border bg-surface-card p-4 md:p-6">
              <h2 className="mb-3 text-base font-bold">{t("payment")}</h2>
              <div className="flex items-center gap-3 rounded-xl border border-brand-primary bg-brand-primary-soft px-4 py-3">
                <span
                  aria-hidden
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-brand-primary bg-brand-primary"
                >
                  <span className="h-2 w-2 rounded-full bg-surface-card" />
                </span>
                <Banknote className="h-5 w-5 text-brand-primary" />
                <div>
                  <p className="font-semibold">{t("cashOnDelivery")}</p>
                  <p className="text-xs text-text-secondary">{t("cashOnDeliveryHint")}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Summary */}
          <section
            aria-labelledby={`${formId}-summary`}
            className="rounded-card border border-border bg-surface-card p-4 md:sticky md:top-6 md:p-6"
          >
            <h2 id={`${formId}-summary`} className="mb-4 text-base font-bold">
              {t("orderSummary")}
            </h2>
            {cart.hydrated && <CartLines />}
            <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">{t("subtotal")}</dt>
                <dd className="font-semibold tabular-nums">{formatRs(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary" dir="auto">
                  {fulfillment === "delivery"
                    ? `${t("delivery")}${selectedArea ? ` (${selectedArea.name})` : ""}`
                    : t("pickup")}
                </dt>
                <dd className="font-semibold tabular-nums">{formatRs(deliveryFee)}</dd>
              </div>
              <div className="mt-1 flex justify-between border-t border-border pt-3 text-base">
                <dt className="font-bold">{t("total")}</dt>
                <dd className="font-extrabold tabular-nums text-brand-primary">{formatRs(total)}</dd>
              </div>
            </dl>

            {belowMin && (
              <p className="mt-3 rounded-xl bg-brand-accent-soft px-3 py-2 text-xs font-medium text-status-new-fg">
                {t("belowMin", {
                  min: formatRs(shop.min_order),
                  more: formatRs(shop.min_order - subtotal),
                })}
              </p>
            )}
            {formError && (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-xl bg-status-rejected-bg px-3 py-2 text-sm font-medium text-status-rejected-fg"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {formError}
              </p>
            )}

            {/* Desktop submit */}
            <Button
              type="submit"
              variant="whatsapp"
              size="lg"
              disabled={!canSubmit}
              className="mt-4 hidden w-full md:flex"
            >
              {pending ? <Loader2 className="animate-spin" /> : <WhatsAppIcon className="h-5 w-5" />}
              {pending ? t("placing") : t("placeOrder")}
            </Button>
            <p className="mt-3 hidden text-center text-xs text-text-secondary md:block">
              {t("whatsappNote")}
            </p>
          </section>

          {/* Mobile sticky submit */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
            <Button
              type="submit"
              variant="whatsapp"
              size="lg"
              disabled={!canSubmit}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                {pending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <WhatsAppIcon className="h-5 w-5" />
                )}
                {pending ? t("placing") : t("placeOrder")}
              </span>
              <span className="tabular-nums">{formatRs(total)}</span>
            </Button>
            <p className="mt-2 text-center text-[11px] text-text-secondary">{t("whatsappNote")}</p>
          </div>
        </form>
      )}
    </div>
  );
}
