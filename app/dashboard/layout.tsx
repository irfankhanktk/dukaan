import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { DashboardShell, DashboardShellSkeleton } from "@/components/dashboard/shell";

export const metadata: Metadata = {
  title: { default: "Orders · Dukaan", template: "%s · Dukaan" },
  description: "Your Dukaan shop dashboard — orders, menu and sales.",
  applicationName: "Dukaan",
  appleWebApp: { capable: true, title: "Dukaan", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0F5C4A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// The shell reads the auth cookie, so with Cache Components it must stream inside <Suspense>.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardShellSkeleton />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
