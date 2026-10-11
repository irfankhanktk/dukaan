import type { MetadataRoute } from "next";

/** Web app manifest for the installable shopkeeper dashboard (served at /manifest.webmanifest). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "Dukaan Dashboard",
    short_name: "Dukaan",
    description: "Orders, menu and sales for your shop.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8F5EF",
    theme_color: "#0F5C4A",
    categories: ["business", "food", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Orders", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Sales", url: "/dashboard/sales", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
