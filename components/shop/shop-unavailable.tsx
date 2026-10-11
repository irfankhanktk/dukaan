"use client";

import Link from "next/link";
import { Store } from "lucide-react";
import { LanguageToggle, useLang } from "./language";

/** Shown at /[slug] for a suspended shop: "This shop is not taking orders right now". */
export function ShopUnavailable() {
  const { t } = useLang();
  return (
    <main className="flex min-h-svh flex-col bg-surface-bg">
      <div className="flex justify-end px-4 pt-3 md:px-6">
        <LanguageToggle className="bg-brand-primary" />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm rounded-card border border-border bg-surface-card p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-accent-soft text-brand-accent">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold">{t("unavailableTitle")}</h1>
          <p className="mt-2 text-sm text-text-secondary">{t("unavailableBody")}</p>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-brand-primary hover:underline">
            {t("poweredBy")}
          </Link>
        </div>
      </div>
    </main>
  );
}
