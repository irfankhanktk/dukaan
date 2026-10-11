import { createClient } from "@/lib/supabase/server";
import { formatPhone } from "@/lib/format";
import type { OrderWithItems, Shop } from "@/lib/types";
import { OrderCard } from "@/components/ui/order-card";
import { ViewAsButton } from "./view-as-button";
import { formatDateTime } from "./shared";

/** Last 50 orders, read-only. Status changes happen in the dashboard (view as shopkeeper). */
export async function OrdersTab({ shop }: { shop: Shop }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(product_name, quantity, options, unit)")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<OrderWithItems[]>();
  const orders = data ?? [];
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-card p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <p className="text-sm text-text-secondary">
          Latest {orders.length} order{orders.length === 1 ? "" : "s"} (read-only). To accept or update orders, open
          the shop&apos;s dashboard.
        </p>
        <ViewAsButton shopId={shop.id} label="Open in dashboard" size="sm" />
      </div>

      {error && (
        <p className="rounded-xl bg-status-rejected-bg px-4 py-3 text-sm text-status-rejected-fg">
          Couldn&apos;t load orders: {error.message}
        </p>
      )}

      {orders.length === 0 && !error ? (
        <div className="rounded-card border border-dashed border-border px-4 py-10 text-center text-sm text-text-secondary">
          No orders yet.
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => (
            <li key={o.id}>
              <OrderCard order={o} items={o.order_items} now={now} />
              <p className="mt-1 px-1 text-[11px] text-text-secondary">
                {formatDateTime(o.created_at)} · {formatPhone(o.customer_phone)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
