import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRs } from "@/lib/format";
import { ProductImage } from "./product-image";

/**
 * Figma "Product card": name, description, price on the left; photo with a
 * "+" button on the right. Whole card is clickable.
 */
export function ProductCard({
  name,
  description,
  price,
  fromPrice,
  fromLabel = "from",
  unitLabel,
  photoUrl,
  available = true,
  soldOutLabel = "Sold out",
  onAdd,
  className,
}: {
  name: string;
  description?: string | null;
  price: number;
  /** Show "from Rs 1,200" when options can change the price */
  fromPrice?: boolean;
  fromLabel?: string;
  unitLabel?: string;
  photoUrl?: string | null;
  available?: boolean;
  soldOutLabel?: string;
  onAdd?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={available ? onAdd : undefined}
      disabled={!available}
      className={cn(
        "flex w-full items-stretch gap-3 rounded-card border border-border bg-surface-card p-4 text-start transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:hover:shadow-none",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-[17px] font-bold leading-snug">{name}</h3>
        {description && (
          <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{description}</p>
        )}
        <div className="mt-auto pt-2">
          {available ? (
            <p className="text-[17px] font-bold text-brand-primary">
              {fromPrice && <span className="font-semibold">{fromLabel} </span>}
              {formatRs(price)}
              {unitLabel && (
                <span className="text-sm font-medium text-text-secondary"> / {unitLabel}</span>
              )}
            </p>
          ) : (
            <p className="text-sm font-semibold text-feedback-danger">{soldOutLabel}</p>
          )}
        </div>
      </div>
      <div className="relative h-24 w-24 shrink-0">
        <ProductImage
          src={photoUrl}
          alt={name}
          className={cn("h-24 w-24", !available && "grayscale")}
        />
        {available && (
          <span className="absolute -bottom-1 -end-1 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-surface-card bg-brand-primary text-text-inverse">
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </span>
        )}
      </div>
    </button>
  );
}
