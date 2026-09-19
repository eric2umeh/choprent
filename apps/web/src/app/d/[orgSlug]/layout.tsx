import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoadingState } from "@/components/ui/loading-state";
import { DashboardShellClient } from "@/components/layout/dashboard-shell-client";
import { requireStaffContext } from "@/lib/auth/session";
import { countPendingPayments } from "@/lib/data/dashboard-stats";
import { countUnreadNotifications } from "@/lib/data/notifications";
import { syncOrgSlugFromWorkspaceName } from "@/lib/auth/sync-org-slug";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);

  if (ctx.role === "owner") {
    const synced = await syncOrgSlugFromWorkspaceName({
      orgId: ctx.org.id,
      orgName: ctx.org.name,
      currentSlug: ctx.org.slug,
      ownerEmail: ctx.user.email,
    });
    if (synced && synced !== orgSlug) {
      redirect(`/d/${synced}`);
    }
  }

  const [pendingCount, notificationCount] = await Promise.all([
    countPendingPayments(ctx.org.id),
    countUnreadNotifications(ctx.user.id, ctx.org.id),
  ]);

  return (
    <Suspense fallback={<LoadingState fullScreen label="Loading dashboard…" />}>
      <DashboardShellClient
        orgSlug={ctx.org.slug}
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
