"use client";

import { useEffect } from "react";

/** Registers the dashboard service worker (public/sw.js) so the dashboard is installable. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Installability is a nice-to-have; ignore registration failures.
    });
  }, []);
  return null;
}
