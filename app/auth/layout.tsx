import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-surface-bg">
      <div className="h-36 bg-brand-primary">
        <div className="mx-auto max-w-sm px-6 pt-8">
          <Link href="/" className="text-xl font-extrabold text-text-inverse">
            Dukaan
          </Link>
          <p className="text-sm text-text-inverse/80">Shopkeeper dashboard</p>
        </div>
      </div>
      <div className="-mt-12 flex w-full justify-center px-4 pb-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
