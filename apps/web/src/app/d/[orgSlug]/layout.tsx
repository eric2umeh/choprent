import { Suspense } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { DashboardShellClient } from "@/components/layout/dashboard-shell-client";
import { requireStaffContext } from "@/lib/auth/session";
import { countPendingPayments } from "@/lib/data/dashboard-stats";
import { countUnreadNotifications } from "@/lib/data/notifications";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const [pendingCount, notificationCount] = await Promise.all([
    countPendingPayments(ctx.org.id),
    countUnreadNotifications(ctx.user.id, ctx.org.id),
  ]);

  return (
    <Suspense fallback={<LoadingState fullScreen label="Loading dashboard…" />}>
      <DashboardShellClient
        orgSlug={orgSlug}
        role={ctx.role}
        userId={ctx.user.id}
        orgId={ctx.org.id}
        userName={ctx.user.displayName}
        userInitials={ctx.user.initials}
        pendingCount={pendingCount}
        notificationCount={notificationCount}
      >
        {children}
      </DashboardShellClient>
    </Suspense>
  );
}
