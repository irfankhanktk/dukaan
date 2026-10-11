import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import type { Shop } from "@/lib/types";
import { ShopHeader, ShopTabs } from "@/components/admin/shop-detail/shop-header";
import { OverviewTab } from "@/components/admin/shop-detail/overview-tab";
import { MenuTab } from "@/components/admin/shop-detail/menu-tab";
import { OrdersTab } from "@/components/admin/shop-detail/orders-tab";
import { OwnerTab } from "@/components/admin/shop-detail/owner-tab";
import { BillingTab } from "@/components/admin/shop-detail/billing-tab";
import { AuditLogList } from "@/components/admin/shop-detail/audit-log";
import { parseShopTab, shopTabHref } from "@/components/admin/shop-detail/shared";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!z.guid().safeParse(id).success) return { title: "Shop" };
  const { supabase } = await requireSuperAdmin();
  const { data } = await supabase.from("shops").select("name").eq("id", id).maybeSingle<{ name: string }>();
  return { title: data?.name ?? "Shop" };
}

export default async function ShopDetailPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { supabase } = await requireSuperAdmin();
  if (!z.guid().safeParse(id).success) notFound();

  const { data: shop } = await supabase.from("shops").select("*").eq("id", id).maybeSingle<Shop>();
  if (!shop) notFound();

  const tab = parseShopTab(sp.tab);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  return (
    <div className="mx-auto max-w-[1200px] p-4 md:p-8">
      <ShopHeader shop={shop} />
      <ShopTabs shopId={shop.id} active={tab} />
      <div className="mt-4 md:mt-6">
        {tab === "overview" && <OverviewTab shop={shop} />}
        {tab === "menu" && <MenuTab shop={shop} />}
        {tab === "orders" && <OrdersTab shop={shop} />}
        {tab === "owner" && <OwnerTab shop={shop} />}
        {tab === "billing" && <BillingTab shop={shop} />}
        {tab === "activity" && (
          <AuditLogList
            shopId={shop.id}
            page={page}
            showShop={false}
            pageHref={(p) => shopTabHref(shop.id, "activity", p > 1 ? { page: String(p) } : undefined)}
          />
        )}
      </div>
    </div>
  );
}
