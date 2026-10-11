import type { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: { default: "Admin · Dukaan", template: "%s · Dukaan admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side role check: only super admins get past this line.
  const admin = await requireSuperAdmin();
  const { count: newRequests } = await admin.supabase
    .from("shop_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  return (
    <div className="min-h-svh bg-surface-bg md:flex">
      <AdminNav
        email={admin.email}
        name={admin.fullName}
        newRequests={newRequests ?? 0}
        mfaEnrolled={admin.mfaEnrolled}
      />
      <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
    </div>
  );
}
