import { ImageResponse } from "next/og";
import { BUSINESS_TYPE_LABELS } from "@/lib/home-i18n";
import { shopPlace } from "@/lib/seo";
import type { PublicShop } from "@/lib/types";

export const OG_SIZE = { width: 1200, height: 630 };

function initials(name: string) {
  return name
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/**
 * Social preview card for a shop link (WhatsApp, Facebook, X…). Uses initials rather than the
 * uploaded logo because logos are usually WebP, which the OG renderer can't draw.
 */
export function shopOgImage(shop: PublicShop | null) {
  const brand = "#0F5C4A";
  const color = shop?.cover_color || brand;
  const name = shop?.name ?? "Dukaan";
  const place = shop ? shopPlace(shop) : "";
  const type = shop ? BUSINESS_TYPE_LABELS.en[shop.business_type] : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8F5EF" }}>
        <div style={{ height: 210, background: color, display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", padding: "0 72px", marginTop: -90, flex: 1 }}>
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: 36,
              background: "#E39B2D",
              border: "10px solid #F8F5EF",
              color: "#FFFFFF",
              fontSize: 72,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {initials(name)}
          </div>
          <div style={{ fontSize: 68, fontWeight: 800, color: "#1F1D1A", marginTop: 24, lineHeight: 1.1, display: "flex" }}>
            {name.length > 34 ? `${name.slice(0, 33)}…` : name}
          </div>
          <div style={{ fontSize: 32, color: "#6B665D", marginTop: 12, display: "flex" }}>
            {[type, place].filter(Boolean).join(" · ")}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", marginBottom: 56 }}>
            <div
              style={{
                display: "flex",
                background: "#15803D",
                color: "#FFFFFF",
                fontSize: 32,
                fontWeight: 700,
                padding: "16px 32px",
                borderRadius: 18,
              }}
            >
              Order online · sent on WhatsApp
            </div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: brand }}>Dukaan</div>
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
