import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  Banknote,
  BellRing,
  Cake,
  Check,
  ChevronDown,
  CookingPot,
  Languages,
  Link2,
  MessageCircle,
  NotebookPen,
  Pill,
  ShoppingBasket,
  Smartphone,
  Store,
  TrendingUp,
  UtensilsCrossed,
  PencilLine,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeLanguageToggle } from "@/components/home/language-toggle";
import { PhoneMockup } from "@/components/home/phone-mockup";
import { RegisterForm } from "@/components/home/register-form";
import { isLang, langDir, LANG_COOKIE, type Lang } from "@/lib/i18n";
import {
  BUSINESS_TYPE_LABELS,
  DEMO_SHOP_SLUG,
  PLAN_PRICE,
  PLATFORM_WHATSAPP_TEXT,
  homeStrings,
  siteUrl,
} from "@/lib/home-i18n";
import { jsonLd } from "@/lib/seo";
import { formatRs } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import type { BusinessType } from "@/lib/types";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** `?lang=` wins (shareable / crawlable Urdu version), then the saved cookie, then English. */
async function resolveLang(searchParams: SearchParams): Promise<Lang> {
  const q = (await searchParams).lang;
  if (isLang(q)) return q;
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(c) ? c : "en";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const lang = await resolveLang(searchParams);
  const t = homeStrings(lang);
  const url = lang === "ur" ? "/?lang=ur" : "/";
  return {
    title: { absolute: t.meta.title },
    description: t.meta.description,
    alternates: {
      canonical: url,
      languages: { en: "/", ur: "/?lang=ur" },
    },
    openGraph: {
      type: "website",
      url,
      siteName: "Dukaan",
      title: t.meta.title,
      description: t.meta.description,
      locale: lang === "ur" ? "ur_PK" : "en_PK",
    },
    twitter: {
      card: "summary_large_image",
      title: t.meta.title,
      description: t.meta.description,
    },
  };
}

const WHO_ICONS: Partial<Record<BusinessType, LucideIcon>> = {
  restaurant: UtensilsCrossed,
  home_kitchen: CookingPot,
  bakery: Cake,
  grocery: ShoppingBasket,
  pharmacy: Pill,
  stationery: NotebookPen,
};
const STEP_ICONS: LucideIcon[] = [Store, Link2, MessageCircle];
const FEATURE_ICONS: LucideIcon[] = [BellRing, Languages, Banknote, Smartphone, PencilLine, TrendingUp];

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const lang = await resolveLang(searchParams);
  const t = homeStrings(lang);
  const dir = langDir(lang);
  const platformWa = process.env.NEXT_PUBLIC_PLATFORM_WHATSAPP?.replace(/\D/g, "");
  const whatsappHref = platformWa ? waLink(platformWa, PLATFORM_WHATSAPP_TEXT) : null;
  const demoHref = `/${DEMO_SHOP_SLUG}`;
  const arrow = <ArrowRight className="rtl:rotate-180" aria-hidden />;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faq.items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const base = siteUrl();
  const siteJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#org`,
        name: "Dukaan",
        url: `${base}/`,
        logo: `${base}/icons/icon-512.png`,
        areaServed: { "@type": "Country", name: "Pakistan" },
        ...(platformWa
          ? {
              contactPoint: {
                "@type": "ContactPoint",
                telephone: `+${platformWa}`,
                contactType: "sales",
                availableLanguage: ["en", "ur"],
              },
            }
          : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: "Dukaan",
        url: `${base}/`,
        inLanguage: ["en", "ur"],
        publisher: { "@id": `${base}/#org` },
      },
      {
        "@type": "Service",
        name: t.meta.title,
        description: t.meta.description,
        serviceType: "Online ordering via WhatsApp",
        provider: { "@id": `${base}/#org` },
        areaServed: { "@type": "Country", name: "Pakistan" },
        ...(PLAN_PRICE !== null
          ? { offers: { "@type": "Offer", price: PLAN_PRICE, priceCurrency: "PKR", description: "Monthly subscription" } }
          : {}),
      },
    ],
  };

  return (
    <div
      dir={dir}
      lang={lang}
      className="min-h-dvh overflow-x-hidden bg-surface-bg text-text-primary"
      style={
        lang === "ur"
          ? { fontFamily: "var(--font-jakarta), var(--font-urdu), system-ui, sans-serif", lineHeight: 1.9 }
          : undefined
      }
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(siteJsonLd) }} />

      {/* ------------------------------------------------------------------ Hero */}
      <header className="bg-brand-primary text-text-inverse">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4"
        >
          <Link href={lang === "ur" ? "/?lang=ur" : "/"} className="font-sans text-xl font-extrabold">
            Dukaan
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-text-inverse/85 md:flex">
            <a href="#how" className="hover:text-text-inverse">
              {t.nav.howItWorks}
            </a>
            <a href="#pricing" className="hover:text-text-inverse">
              {t.nav.pricing}
            </a>
            <a href="#faq" className="hover:text-text-inverse">
              {t.nav.faq}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <HomeLanguageToggle lang={lang} label={t.nav.language} />
            <Link
              href="/auth/login"
              className="text-sm font-semibold underline-offset-4 hover:underline"
            >
              {t.nav.login}
            </Link>
          </div>
        </nav>

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 md:grid-cols-[1.15fr_1fr] md:pb-24 md:pt-14">
          <div>
            <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-accent-soft">
              {t.hero.eyebrow}
            </p>
            <h1 className="mt-4 text-[2rem] font-extrabold leading-tight md:text-5xl md:leading-[1.1]">
              {t.hero.title}
            </h1>
            <p className="mt-4 max-w-xl text-base text-text-inverse/80 md:text-lg">{t.hero.body}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-brand-accent text-text-primary hover:bg-brand-accent/90"
              >
                <a href="#register">
                  {t.hero.ctaRegister}
                  {arrow}
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="border-white/30 bg-transparent text-text-inverse hover:bg-white/10"
              >
                <Link href={demoHref}>{t.hero.ctaDemo}</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-inverse/85">
              {t.hero.points.map((p) => (
                <li key={p} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-brand-accent" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden md:block">
            <PhoneMockup t={t.demo} />
          </div>
        </div>
      </header>

      <main>
        {/* ---------------------------------------------------------- How it works */}
        <section id="how" aria-labelledby="how-title" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <SectionHeading id="how-title" title={t.how.title} subtitle={t.how.subtitle} />
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {t.how.steps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? Store;
              return (
                <li key={step.title} className="rounded-card border border-border bg-surface-card p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="font-sans text-sm font-bold text-brand-accent">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-text-secondary">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ------------------------------------------------------------ Who it's for */}
        <section aria-labelledby="who-title" className="bg-surface-card py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading id="who-title" title={t.who.title} subtitle={t.who.subtitle} />
            <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
              {t.who.items.map((item) => {
                const Icon = WHO_ICONS[item.key] ?? Store;
                return (
                  <li
                    key={item.key}
                    className="rounded-card border border-border bg-surface-bg p-4 last:col-span-2 md:p-5 md:last:col-span-1"
                  >
                    <Icon className="h-6 w-6 text-brand-primary" aria-hidden />
                    <h3 className="mt-3 font-bold">{BUSINESS_TYPE_LABELS[lang][item.key]}</h3>
                    <p className="mt-1 text-xs text-text-secondary md:text-sm">{item.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------------ Demo shop */}
        <section aria-labelledby="demo-title" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="grid items-center gap-10 overflow-hidden rounded-[24px] bg-brand-primary-soft px-6 py-10 md:grid-cols-2 md:px-12">
            <div>
              <h2 id="demo-title" className="text-2xl font-extrabold md:text-3xl">
                {t.demo.title}
              </h2>
              <p className="mt-3 text-text-secondary">{t.demo.body}</p>
              <Button asChild size="lg" className="mt-6">
                <Link href={demoHref}>
                  {t.demo.cta}
                  {arrow}
                </Link>
              </Button>
            </div>
            <Link href={demoHref} aria-label={t.demo.cta} className="block py-2">
              <PhoneMockup t={t.demo} />
            </Link>
          </div>
        </section>

        {/* ------------------------------------------------------------ Features */}
        <section aria-labelledby="features-title" className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
          <SectionHeading id="features-title" title={t.features.title} />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {t.features.items.map((f, i) => {
              const Icon = FEATURE_ICONS[i] ?? Store;
              return (
                <li key={f.title} className="rounded-card border border-border bg-surface-card p-5">
                  <Icon className="h-6 w-6 text-brand-primary" aria-hidden />
                  <h3 className="mt-3 font-bold">{f.title}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{f.body}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ------------------------------------------------------------ Pricing */}
        <section id="pricing" aria-labelledby="pricing-title" className="bg-surface-card py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading id="pricing-title" title={t.pricing.title} subtitle={t.pricing.subtitle} />
            <div className="mx-auto mt-10 max-w-md rounded-card border-2 border-brand-primary bg-surface-bg p-6 md:p-8">
              <p className="font-sans text-sm font-bold uppercase tracking-wide text-brand-primary">
                {t.pricing.planName}
              </p>
              <p className="mt-2">
                {PLAN_PRICE !== null ? (
                  <>
                    <span className="font-sans text-4xl font-extrabold" dir="ltr">
                      {formatRs(PLAN_PRICE)}
                    </span>
                    <span className="text-text-secondary">{t.pricing.perMonth}</span>
                  </>
                ) : (
                  <span className="text-2xl font-extrabold">{t.pricing.contactForPrice}</span>
                )}
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {t.pricing.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="mt-8 w-full">
                <a href="#register">{t.pricing.cta}</a>
              </Button>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <SectionHeading id="faq-title" title={t.faq.title} />
          <div className="mt-8 space-y-3">
            {t.faq.items.map((f) => (
              <details
                key={f.q}
                className="group rounded-card border border-border bg-surface-card px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.q}
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-text-secondary transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="mt-2 text-sm text-text-secondary">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ Register */}
        <section
          id="register"
          aria-labelledby="register-title"
          className="scroll-mt-4 bg-brand-primary py-16 text-text-inverse md:py-20"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[1fr_1.3fr]">
            <div>
              <h2 id="register-title" className="text-3xl font-extrabold md:text-4xl">
                {t.register.title}
              </h2>
              <p className="mt-3 text-text-inverse/80">{t.register.subtitle}</p>
              {whatsappHref && (
                <div className="mt-8 rounded-card bg-white/10 p-5">
                  <p className="font-bold">{t.register.preferWhatsapp}</p>
                  <p className="mt-1 text-sm text-text-inverse/80">{t.register.preferWhatsappBody}</p>
                  <Button asChild variant="whatsapp" size="lg" className="mt-4 w-full sm:w-auto">
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircle aria-hidden />
                      {t.register.messageUs}
                    </a>
                  </Button>
                </div>
              )}
            </div>
            <div className="text-text-primary">
              <RegisterForm t={t.register} businessLabels={BUSINESS_TYPE_LABELS[lang]} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface-bg">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-text-secondary md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-sans text-base font-extrabold text-brand-primary">Dukaan</p>
            <p>{t.footer.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href={demoHref} className="hover:text-text-primary">
              {t.footer.demo}
            </Link>
            <Link href="/auth/login" className="hover:text-text-primary">
              {t.footer.login}
            </Link>
            <a href="#register" className="hover:text-text-primary">
              {t.nav.register}
            </a>
          </div>
          <p className="text-xs">
            © {new Date().getFullYear()} Dukaan. {t.footer.rights}
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 id={id} className="text-2xl font-extrabold md:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-text-secondary">{subtitle}</p>}
    </div>
  );
}
