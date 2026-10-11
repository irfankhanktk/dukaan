import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import { getShopContext } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export const metadata = { title: "No shop yet" };

export default async function NoShopPage() {
  const { shop, email, isSuperAdmin } = await getShopContext();
  if (shop) redirect("/dashboard");
  if (isSuperAdmin) redirect("/admin/shops");

  return (
    <main className="flex min-h-svh items-center justify-center bg-surface-bg px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-accent-soft text-brand-accent">
          <Store className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-bold">Your account isn&apos;t linked to a shop yet</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Please contact the Dukaan admin to set up your shop.
          {email ? (
            <>
              {" "}
              Share this email with them: <span className="font-semibold text-text-primary">{email}</span>
            </>
          ) : null}
        </p>
        <div className="mt-6 flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
