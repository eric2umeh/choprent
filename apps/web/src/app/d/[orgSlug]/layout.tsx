import { Suspense } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { DashboardShellClient } from "@/components/layout/dashboard-shell-client";
import { requireStaffContext } from "@/lib/auth/session";
import { getDashboardStats } from "@/lib/data/dashboard-stats";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const stats = await getDashboardStats(ctx.org.id);

  return (
    <Suspense fallback={<LoadingState fullScreen label="Loading dashboard…" />}>
      <DashboardShellClient
        orgSlug={orgSlug}
        role={ctx.role}
        userName={ctx.user.displayName}
        userInitials={ctx.user.initials}
        pendingCount={stats.pendingVerifications}
      >
        {children}
      </DashboardShellClient>
    </Suspense>
  );
}
