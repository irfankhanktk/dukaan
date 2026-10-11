import { requireSuperAdmin } from "@/lib/auth";
import { MfaManager } from "@/components/admin/security/mfa-manager";

export const metadata = { title: "Security" };

export default async function SecurityPage() {
  const admin = await requireSuperAdmin();
  return (
    <div className="mx-auto max-w-[760px] p-4 md:p-8">
      <h1 className="text-xl font-bold md:text-[28px]">Security</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Signed in as {admin.email}. Super admins can open every shop, so protect this account with two-step
        verification.
      </p>
      <div className="mt-4 md:mt-6">
        <MfaManager email={admin.email} />
      </div>
    </div>
  );
}
