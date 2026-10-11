import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/`;

/** Only Supabase Storage images go through the Next.js optimizer (see images.remotePatterns). */
function optimizable(src: string) {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && src.startsWith(STORAGE_PREFIX);
}

/** Product photo, or the warm placeholder tile from the design when there is none. */
export function ProductImage({
  src,
  alt,
  className,
  sizes = "96px",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Rendered width hint for responsive srcset, e.g. "(min-width: 768px) 512px, 100vw". */
  sizes?: string;
  priority?: boolean;
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
  // Sized wrapper (callers pass h-/w- classes) + fill image: resized, WebP/AVIF, no layout shift.
  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={!optimizable(src)}
        className="object-cover"
      />
    </div>
  );
}

/** Square initials avatar for a shop ("AB" for Ali Bakers). */
export function ShopAvatar({
  name,
  logoUrl,
  className,
  priority = false,
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
  priority?: boolean;
}) {
  if (logoUrl) {
    return (
      <div className={cn("relative h-12 w-12 shrink-0 overflow-hidden rounded-xl", className)}>
        <Image
          src={logoUrl}
          alt={name}
          fill
          sizes="80px"
          priority={priority}
          unoptimized={!optimizable(logoUrl)}
          className="object-cover"
        />
      </div>
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
