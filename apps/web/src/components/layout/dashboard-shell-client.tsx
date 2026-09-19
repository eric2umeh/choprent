"use client";

import { useState } from "react";
import {
  DashboardMobileNav,
  DashboardSidebar,
  DashboardTopBar,
} from "@/components/layout/dashboard-nav";
import { StaffNotificationListener } from "@/components/notifications/staff-notification-listener";
import { AppUsageRecorder } from "@/components/pwa/app-usage-recorder";
import { AddToHomeScreenPrompt } from "@/components/pwa/add-to-home-screen";
import { PreventAuthHistoryBack } from "@/components/auth/prevent-auth-history-back";

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
    <>
      <PreventAuthHistoryBack />
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
        <div className="dashboard-main flex min-h-screen min-w-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <DashboardTopBar
            onOpenSidebar={() => setMobileSidebarOpen(true)}
            notificationCount={notificationCount}
          />
          <main className="dashboard-page flex-1">{children}</main>
        </div>
      </div>
      {/* Outside the flex row so fixed bottom tabs are never squeezed off-screen */}
      <DashboardMobileNav
        orgSlug={orgSlug}
        pendingCount={pendingCount}
        notificationCount={notificationCount}
      />
      <AddToHomeScreenPrompt orgSlug={orgSlug} userId={userId} audience="staff" />
    </>
  );
}
