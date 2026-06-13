"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DashboardMobileNav,
  DashboardSidebar,
  DashboardTopBar,
} from "@/components/layout/dashboard-nav";
import { getMockUser, MOCK_STATS, type MockRole } from "@/lib/mock/data";

const STAFF_ROLES: MockRole[] = ["owner", "manager", "agent"];

export function DashboardShellClient({
  orgSlug,
  children,
}: {
  orgSlug: string;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const role = (
    STAFF_ROLES.includes(roleParam as MockRole) ? roleParam : "owner"
  ) as MockRole;
  const user = getMockUser(role);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-subtle">
      <DashboardSidebar
        orgSlug={orgSlug}
        role={role}
        userName={user.name}
        userInitials={user.initials}
        pendingCount={MOCK_STATS.pendingVerifications}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />
      <div className="dashboard-main flex min-h-screen min-w-0 flex-1 flex-col pb-14 lg:pb-0">
        <DashboardTopBar onOpenSidebar={() => setMobileSidebarOpen(true)} />
        <main className="dashboard-page flex-1">{children}</main>
      </div>
      <DashboardMobileNav
        orgSlug={orgSlug}
        pendingCount={MOCK_STATS.pendingVerifications}
      />
    </div>
  );
}
