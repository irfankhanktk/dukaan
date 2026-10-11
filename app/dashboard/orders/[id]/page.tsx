import Link from "next/link";
import { requireShopContext } from "@/lib/auth";
import type { OrderWithItems } from "@/lib/types";
import { OrderDetail } from "@/components/dashboard/order-detail";

export const metadata = { title: "Order details" };

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, shop } = await requireShopContext();

  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const { data: order } = valid
    ? await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("shop_id", shop.id)
        .eq("id", id)
        .maybeSingle<OrderWithItems>()
    : { data: null };

  if (!order) {
    return (
      <main className="flex min-h-[60svh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-bold">Order not found</p>
        <p className="text-sm text-text-secondary">It may belong to another shop or the link is wrong.</p>
        <Link href="/dashboard" className="text-sm font-semibold text-brand-primary hover:underline">
          Back to orders
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto -mb-24 max-w-2xl md:mb-0">
      <OrderDetail order={order} shopName={shop.name} variant="page" now={new Date()} />
    </main>
  );
}
