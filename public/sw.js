/* Dukaan service worker — makes the shopkeeper dashboard installable and resilient offline.
 * - Cache-first: /_next/static/*, /icons/*, /apple-touch-icon.png (immutable / versioned assets)
 * - Network-first: page navigations under /dashboard, falling back to the last cached copy,
 *   then to /offline.html
 * - Never cached: non-GET requests, cross-origin requests (Supabase API, Realtime, Storage),
 *   Next.js RSC/data requests and server actions.
 */
const VERSION = "v1";
const STATIC_CACHE = `dukaan-static-${VERSION}`;
const PAGES_CACHE = `dukaan-pages-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("dukaan-") && k !== STATIC_CACHE && k !== PAGES_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/apple-touch-icon.png"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // POSTs (server actions, orders) always go to the network
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase API / realtime / storage: never cached

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  const isDashboardNavigation =
    request.mode === "navigate" &&
    (url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/"));

  if (isDashboardNavigation) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          // Only keep real pages (not login redirects or errors).
          if (response.ok && !response.redirected) {
            const cache = await caches.open(PAGES_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await caches.match(request, { ignoreSearch: true });
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
        }
      })(),
    );
  }
  // Everything else (customer shop pages, RSC payloads, admin) uses the network as normal.
});

// Tapping a new-order notification focuses an open dashboard window or opens one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        const url = new URL(client.url);
        if (url.pathname.startsWith("/dashboard") && "focus" in client) {
          if ("navigate" in client && url.pathname + url.search !== target) {
            client.navigate(target).catch(() => {});
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

// Logging out clears cached dashboard pages (they may contain order details).
self.addEventListener("message", (event) => {
  if (event.data === "dukaan:clear-pages") {
    event.waitUntil(caches.delete(PAGES_CACHE));
  }
});
