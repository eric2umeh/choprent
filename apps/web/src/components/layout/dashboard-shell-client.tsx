"use client";

import { useState } from "react";
import {
  DashboardMobileNav,
  DashboardSidebar,
  DashboardTopBar,
} from "@/components/layout/dashboard-nav";

export function DashboardShellClient({
  orgSlug,
  role,
  userName,
  userInitials,
  pendingCount,
  children,
}: {
  orgSlug: string;
  role: import("@/types/database").MembershipRole;
  userName: string;
  userInitials: string;
  pendingCount: number;
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      <DashboardSidebar
        orgSlug={orgSlug}
        role={role}
        userName={userName}
        userInitials={userInitials}
        pendingCount={pendingCount}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />
      <div className="dashboard-main flex min-h-screen min-w-0 flex-1 flex-col pb-14 lg:pb-0">
        <DashboardTopBar onOpenSidebar={() => setMobileSidebarOpen(true)} />
        <main className="dashboard-page flex-1">{children}</main>
      </div>
      <DashboardMobileNav orgSlug={orgSlug} pendingCount={pendingCount} />
    </div>
  );
}
