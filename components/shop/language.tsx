"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LANG_COOKIE,
  LANG_STORAGE_KEY,
  langDir,
  translate,
  type I18nKey,
  type Lang,
  type TranslateVars,
} from "@/lib/i18n";

type LangContext = {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (lang: Lang) => void;
  t: (key: I18nKey, vars?: TranslateVars) => string;
};

const Ctx = createContext<LangContext | null>(null);

/**
 * Holds the customer-site language. The choice is saved in a cookie (so Server Components
 * render in the right language) and localStorage. Urdu switches the subtree to RTL and
 * puts Noto Nastaliq Urdu behind Plus Jakarta Sans, so Urdu strings use Nastaliq while
 * Latin product names keep the UI font.
 */
export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
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
      // Re-render Server Components (order page, headings) in the new language.
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LangContext>(
    () => ({
      lang,
      dir: langDir(lang),
      setLang,
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang, setLang],
  );

  return (
    <Ctx.Provider value={value}>
      <div
        dir={value.dir}
        lang={lang === "ur" ? "ur" : "en"}
        className="min-h-dvh bg-surface-bg text-text-primary"
        style={
          lang === "ur"
            ? {
                fontFamily: "var(--font-jakarta), var(--font-urdu), system-ui, sans-serif",
                lineHeight: 1.9,
              }
            : undefined
        }
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useLang(): LangContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      lang: "en",
      dir: "ltr",
      setLang: () => {},
      t: (key, vars) => translate("en", key, vars),
    };
  }
  return ctx;
}

/** EN | اردو segmented toggle. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  return (
    <div
      role="group"
      aria-label={t("language")}
      dir="ltr"
      className={cn(
        "inline-flex items-center rounded-full bg-black/25 p-0.5 text-xs font-semibold text-white backdrop-blur",
        className,
      )}
    >
      {(["en", "ur"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => lang !== l && setLang(l)}
          className={cn(
            "rounded-full px-3 py-1 transition-colors",
            lang === l ? "bg-surface-card text-brand-primary" : "text-white/90 hover:text-white",
            l === "ur" && "font-urdu leading-[1.6]",
          )}
        >
          {l === "en" ? "EN" : "اردو"}
        </button>
      ))}
    </div>
  );
}
