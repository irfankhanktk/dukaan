import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Product photo, or the warm placeholder tile from the design when there is none. */
export function ProductImage({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-brand-accent-soft text-brand-accent",
          className,
        )}
        aria-hidden
      >
        <ImageIcon className="h-7 w-7" strokeWidth={1.75} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs; avoids remotePatterns config
    <img src={src} alt={alt} loading="lazy" className={cn("rounded-xl object-cover", className)} />
  );
}

/** Square initials avatar for a shop ("AB" for Ali Bakers). */
export function ShopAvatar({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={name} className={cn("h-12 w-12 rounded-xl object-cover", className)} />
    );
  }
  const initials = name
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-accent text-base font-bold text-text-inverse",
        className,
      )}
    >
      {initials}
    </div>
  );
}
