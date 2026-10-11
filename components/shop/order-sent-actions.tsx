"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLang } from "./language";
import { WhatsAppIcon } from "./whatsapp-icon";

/**
 * Big "Send on WhatsApp" button + "Back to menu".
 * With autoOpen (mobile checkout lands here with ?wa=1) WhatsApp is opened once,
 * after the saved order page has loaded.
 */
export function OrderSentActions({
  waUrl,
  menuHref,
  autoOpen,
}: {
  waUrl: string;
  menuHref: string;
  autoOpen: boolean;
}) {
  const { t } = useLang();
  const opened = useRef(false);

  useEffect(() => {
    if (!autoOpen || opened.current || !waUrl) return;
    opened.current = true;
    // Drop ?wa=1 so going back / refreshing doesn't reopen WhatsApp.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("wa");
      window.history.replaceState(window.history.state, "", url.pathname + url.search);
    } catch {
      /* ignore */
    }
    window.location.href = waUrl;
  }, [autoOpen, waUrl]);

  return (
    <div className="flex flex-col gap-3">
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "whatsapp", size: "lg" }), "w-full text-base")}
        >
          <WhatsAppIcon className="h-5 w-5" />
          {t("sendOnWhatsApp")}
        </a>
      )}
      <Link
        href={menuHref}
        className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full")}
      >
        {t("backToMenu")}
      </Link>
    </div>
  );
}
