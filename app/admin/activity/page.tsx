import Link from "next/link";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { AuditLogList } from "@/components/admin/shop-detail/audit-log";

export const metadata = { title: "Activity log" };

/** Action prefixes written by the audit trigger (entity.op) and by lib/audit.ts. */
const ACTION_PREFIXES = [
  { value: "shop.", label: "Shops" },
  { value: "owner.", label: "Owner logins" },
  { value: "shop_member.", label: "Members" },
  { value: "category.", label: "Categories" },
  { value: "product.", label: "Products" },
  { value: "option_", label: "Product options" },
  { value: "order.", label: "Orders" },
  { value: "payment.", label: "Payments" },
  { value: "shop.view_as", label: "View as shopkeeper" },
] as const;

type SP = { shop?: string; action?: string; actor?: string; page?: string };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await requireSuperAdmin();

  const guid = z.guid();
  const shopId = sp.shop && guid.safeParse(sp.shop).success ? sp.shop : undefined;
  const actorId = sp.actor && guid.safeParse(sp.actor).success ? sp.actor : undefined;
  const action = ACTION_PREFIXES.some((a) => a.value === sp.action) ? sp.action : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [{ data: shops }, { data: admins }] = await Promise.all([
    supabase.from("shops").select("id, name").order("name").limit(1000),
    supabase.from("profiles").select("id, full_name").not("platform_role", "is", null).order("full_name"),
  ]);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (shopId) params.set("shop", shopId);
    if (action) params.set("action", action);
    if (actorId) params.set("actor", actorId);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/activity${qs ? `?${qs}` : ""}`;
  };
  const filtered = !!(shopId || action || actorId);

  return (
    <div className="mx-auto max-w-[1200px] p-4 md:p-8">
      <h1 className="text-xl font-bold md:text-[28px]">Activity log</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Every change a super admin makes to a shop&apos;s data, across all shops. Tap an entry to see what changed.
      </p>

      <form method="get" action="/admin/activity" className="mt-4 grid gap-3 md:mt-6 md:grid-cols-[1fr_1fr_1fr_auto]">
        <Select name="shop" defaultValue={shopId ?? ""} aria-label="Shop">
          <option value="">All shops</option>
          {(shops ?? []).map((s) => (
            <option key={s.id as string} value={s.id as string}>
              {s.name as string}
            </option>
          ))}
        </Select>
        <Select name="action" defaultValue={action ?? ""} aria-label="Action">
          <option value="">All actions</option>
          {ACTION_PREFIXES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>
        <Select name="actor" defaultValue={actorId ?? ""} aria-label="Done by">
          <option value="">Anyone</option>
          {(admins ?? []).map((a) => (
            <option key={a.id as string} value={a.id as string}>
              {(a.full_name as string | null) ?? "Unnamed admin"}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button type="submit" className="h-12 flex-1 md:flex-none">
            Filter
          </Button>
          {filtered && (
            <Button asChild variant="secondary" className="h-12">
              <Link href="/admin/activity">Clear</Link>
            </Button>
          )}
        </div>
      </form>

      <div className="mt-4 md:mt-6">
        <AuditLogList
          shopId={shopId}
          actionPrefix={action}
          actorId={actorId}
          page={page}
          pageHref={hrefFor}
          showShop
        />
      </div>
    </div>
  );
}
