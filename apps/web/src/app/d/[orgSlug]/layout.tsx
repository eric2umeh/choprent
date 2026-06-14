import { Suspense } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { DashboardShellClient } from "@/components/layout/dashboard-shell-client";
import { requireStaffContext } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/env";
import { MOCK_ORG } from "@/lib/mock/data";
import { MOCK_STATS } from "@/lib/mock/data";
import { notFound } from "next/navigation";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  if (isDemoMode() && orgSlug !== MOCK_ORG.slug) {
    notFound();
  }

  const ctx = await requireStaffContext(orgSlug);

  return (
    <Suspense fallback={<LoadingState fullScreen label="Loading dashboard…" />}>
      <DashboardShellClient
        orgSlug={orgSlug}
        role={ctx.role}
        userName={ctx.user.displayName}
        userInitials={ctx.user.initials}
        pendingCount={MOCK_STATS.pendingVerifications}
        demoMode={ctx.demoMode}
      >
        {children}
      </DashboardShellClient>
    </Suspense>
  );
}
