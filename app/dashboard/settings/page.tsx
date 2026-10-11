import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireShopOwnerContext } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { LogoutButton } from "@/components/logout-button";
import { SettingsForm } from "@/components/settings/settings-form";
import { ShareCard } from "@/components/settings/share-card";
import { InstallAppCard } from "@/components/settings/install-app-card";
import { SubscriptionCard } from "@/components/settings/subscription-card";

export const metadata: Metadata = { title: "Settings · Dukaan" };

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
}

export default async function SettingsPage() {
  const { shop, email } = await requireShopOwnerContext();
  const shopUrl = `${await siteOrigin()}/${shop.slug}`;

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
      <h1 className="text-2xl font-bold text-text-primary md:text-[28px]">Settings</h1>
      <p className="mt-0.5 text-sm text-text-secondary">Shop details, delivery and your shop link.</p>

      <div className="mt-5 grid gap-4 md:mt-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-start md:gap-6">
        <SettingsForm shop={shop} />

        <div className="flex flex-col gap-4 md:gap-6">
          <ShareCard url={shopUrl} shopName={shop.name} />
          <SubscriptionCard status={shop.status} plan={shop.plan} paidUntil={shop.paid_until} />
          <InstallAppCard />
          <Card className="p-4 md:p-6">
            <h2 className="text-[15px] font-bold text-text-primary">Account</h2>
            <p className="mt-1 break-all text-sm text-text-secondary">Signed in as {email}</p>
            <div className="mt-4">
              <LogoutButton />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
