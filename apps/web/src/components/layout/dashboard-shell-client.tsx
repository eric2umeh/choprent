"use client";

import { useState } from "react";
import {
  DashboardMobileNav,
  DashboardSidebar,
  DashboardTopBar,
} from "@/components/layout/dashboard-nav";
import { StaffNotificationListener } from "@/components/notifications/staff-notification-listener";
import { AppUsageRecorder } from "@/components/pwa/app-usage-recorder";

export function DashboardShellClient({
  orgSlug,
  role,
  userId,
  orgId,
  userName,
  userInitials,
  pendingCount,
  notificationCount,
  children,
}: {
  orgSlug: string;
  role: import("@/types/database").MembershipRole;
  userId: string;
  orgId: string;
  userName: string;
  userInitials: string;
  pendingCount: number;
  notificationCount: number;
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      <StaffNotificationListener userId={userId} orgId={orgId} />
      <AppUsageRecorder orgSlug={orgSlug} userId={userId} audience="staff" />
      <DashboardSidebar
        orgSlug={orgSlug}
        role={role}
        userName={userName}
        userInitials={userInitials}
        pendingCount={pendingCount}
        notificationCount={notificationCount}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />
      <div className="dashboard-main flex min-h-screen min-w-0 flex-1 flex-col pb-14 lg:pb-0">
        <DashboardTopBar
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          notificationCount={notificationCount}
        />
        <main className="dashboard-page flex-1">{children}</main>
      </div>
      <DashboardMobileNav
        orgSlug={orgSlug}
        pendingCount={pendingCount}
        notificationCount={notificationCount}
      />
    </div>
  );
}
