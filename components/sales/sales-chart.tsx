import { formatRs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { compactRs, type Bucket } from "./aggregate";

/**
 * Single-series column chart (plain divs, no chart library).
 * - Brand green columns, the best bucket highlighted in accent (as in the Figma design).
 * - Values on the caps when there are few columns; otherwise only the peak is labelled
 *   and the rest live in the hover/focus tooltip and the screen-reader table.
 */
export function SalesChart({ buckets, title }: { buckets: Bucket[]; title: string }) {
  const max = Math.max(0, ...buckets.map((b) => b.total));
  const peakIndex = max > 0 ? buckets.findIndex((b) => b.total === max) : -1;
  const labelAll = buckets.length <= 8;
  const tickEvery = buckets.length > 20 ? 5 : buckets.length > 12 ? 3 : 1;

  return (
    <figure className="flex flex-col">
      <figcaption className="text-[15px] font-bold text-text-primary">{title}</figcaption>

      {max === 0 ? (
        <div className="mt-4 flex h-44 items-center justify-center rounded-xl bg-surface-bg text-sm text-text-secondary md:h-64">
          No sales in this period yet
        </div>
      ) : (
        <div className="mt-4" aria-hidden>
          <div
            className={cn(
              "flex h-44 items-end border-b border-border md:h-64",
              buckets.length > 12 ? "gap-[2px]" : "gap-2 md:gap-4",
            )}
          >
            {buckets.map((b, i) => {
              const pct = (b.total / max) * 100;
              const showLabel = b.total > 0 && (labelAll || i === peakIndex);
              return (
                <div
                  key={b.key}
                  className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                >
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-text-primary px-2.5 py-1.5 text-xs text-text-inverse shadow-lg group-hover:block">
                    <div className="font-semibold">{formatRs(b.total)}</div>
                    <div className="opacity-80">
                      {b.longLabel} · {b.orders} {b.orders === 1 ? "order" : "orders"}
                    </div>
                  </div>
                  {showLabel && (
                    <span className="mb-1 whitespace-nowrap text-[11px] font-medium text-text-secondary">
                      {labelAll ? "" : "Rs "}
                      {compactRs(b.total)}
                    </span>
                  )}
                  <div
                    className={cn(
                      "w-full max-w-[40px] rounded-t-[6px] transition-opacity group-hover:opacity-80",
                      i === peakIndex ? "bg-brand-accent" : "bg-brand-primary",
                    )}
                    style={{ height: b.total > 0 ? `max(${pct}%, 3px)` : 0 }}
                  />
                </div>
              );
            })}
          </div>
          <div
            className={cn("mt-2 flex", buckets.length > 12 ? "gap-[2px]" : "gap-2 md:gap-4")}
          >
            {buckets.map((b, i) => (
              <div
                key={b.key}
                className="min-w-0 flex-1 overflow-visible text-center text-[11px] text-text-secondary md:text-xs"
              >
                <span className="whitespace-nowrap">
                  {i % tickEvery === 0 || i === buckets.length - 1 ? b.label : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accessible table view of the same numbers */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Sales</th>
            <th scope="col">Orders</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.key}>
              <th scope="row">{b.longLabel}</th>
              <td>{formatRs(b.total)}</td>
              <td>{b.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
