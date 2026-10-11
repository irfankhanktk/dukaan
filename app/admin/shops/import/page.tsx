import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { ImportShopsForm } from "./import-form";

export const metadata = { title: "Import shops" };

export default async function ImportShopsPage() {
  await requireSuperAdmin();
  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <Link
        href="/admin/shops"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-brand-primary"
      >
        <ArrowLeft className="h-4 w-4" /> All shops
      </Link>
      <h1 className="mt-2 text-2xl font-bold md:text-[28px]">Import shops (CSV)</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Each row becomes a shop in <strong>Setup</strong>, ready to continue in the register wizard. Owner logins are
        not created here — create them in step 2 of each shop&apos;s setup.
      </p>
      <div className="mt-5">
        <ImportShopsForm />
      </div>
    </div>
  );
}
