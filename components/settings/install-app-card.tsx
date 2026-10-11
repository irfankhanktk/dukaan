"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** "Install app" using the beforeinstallprompt event when the browser offers it. */
export function InstallAppCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // Reading browser-only values after mount avoids a hydration mismatch.
    setInstalled(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }

  return (
    <Card className="p-4 md:p-6">
      <h2 className="text-[15px] font-bold text-text-primary">Dashboard app</h2>
      {installed ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-status-delivered-fg">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Installed on this device
        </p>
      ) : deferred ? (
        <>
          <p className="text-sm text-text-secondary">
            Add Dukaan to your home screen to open orders in one tap.
          </p>
          <Button type="button" onClick={install} className="mt-4 w-full md:w-auto">
            <Download />
            Install app
          </Button>
        </>
      ) : (
        <p className="mt-1 text-sm text-text-secondary">
          {isIos ? (
            <>
              In Safari, tap <strong className="text-text-primary">Share → Add to Home Screen</strong>.
            </>
          ) : (
            <>
              Open this page in Chrome, then tap{" "}
              <strong className="text-text-primary">⋮ menu → Add to Home screen</strong> (or Install app).
            </>
          )}
        </p>
      )}
    </Card>
  );
}
