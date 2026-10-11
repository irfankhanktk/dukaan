"use client";

import Link from "next/link";
import { LANG_COOKIE, LANG_STORAGE_KEY, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * EN | اردو toggle for the homepage. Plain links (`/?lang=ur`) so both language versions are
 * crawlable; clicking also saves the choice in the same cookie the customer shop site uses.
 */
export function HomeLanguageToggle({
  lang,
  label,
  className,
}: {
  lang: Lang;
  label: string;
  className?: string;
}) {
  const remember = (next: Lang) => {
    try {
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* cookies blocked */
    }
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* storage blocked */
    }
  };

  return (
    <div
      role="group"
      aria-label={label}
      dir="ltr"
      className={cn(
        "inline-flex items-center rounded-full bg-black/20 p-0.5 text-xs font-semibold text-text-inverse",
        className,
      )}
    >
      {(["en", "ur"] as const).map((l) => (
        <Link
          key={l}
          href={`/?lang=${l}`}
          scroll={false}
          hrefLang={l}
          aria-current={lang === l ? "true" : undefined}
          onClick={() => remember(l)}
          className={cn(
            "rounded-full px-3 py-1 transition-colors",
            lang === l
              ? "bg-surface-card text-brand-primary"
              : "text-text-inverse/90 hover:text-text-inverse",
            l === "ur" && "font-urdu leading-[1.6]",
          )}
        >
          {l === "en" ? "EN" : "اردو"}
        </Link>
      ))}
    </div>
  );
}
