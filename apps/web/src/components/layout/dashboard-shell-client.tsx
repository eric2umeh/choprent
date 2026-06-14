"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  DashboardMobileNav,
  DashboardSidebar,
  DashboardTopBar,
} from "@/components/layout/dashboard-nav";
import type { MembershipRole } from "@/types/database";

const STAFF_ROLES: MembershipRole[] = ["owner", "manager", "agent"];

export function DashboardShellClient({
  orgSlug,
  role,
  userName,
  userInitials,
  pendingCount,
  demoMode,
  children,
}: {
  orgSlug: string;
  role: MembershipRole;
  userName: string;
  userInitials: string;
  pendingCount: number;
  demoMode: boolean;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const demoRole = (
    demoMode && roleParam && STAFF_ROLES.includes(roleParam as MembershipRole)
      ? roleParam
      : role
  ) as MembershipRole;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      <DashboardSidebar
        orgSlug={orgSlug}
        role={demoMode ? demoRole : role}
        userName={userName}
        userInitials={userInitials}
        pendingCount={pendingCount}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        demoMode={demoMode}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />
      <div className="dashboard-main flex min-h-screen min-w-0 flex-1 flex-col pb-14 lg:pb-0">
        <DashboardTopBar
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          demoMode={demoMode}
        />
        <main className="dashboard-page flex-1">{children}</main>
      </div>
      <DashboardMobileNav
        orgSlug={orgSlug}
        pendingCount={pendingCount}
        demoMode={demoMode}
      />
    </div>
  );
}
