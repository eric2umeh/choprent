"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Building2,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import type { MembershipRole } from "@/types/database";
import { canAddUnits } from "@/lib/auth/roles";
import { signOutAction } from "@/lib/actions/auth";

const navItems = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/units", label: "Units", icon: Building2 },
  { href: "/leases", label: "Leases", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard, badge: true },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({
  orgSlug,
  role,
  pendingCount,
  collapsed,
  demoMode,
  onNavigate,
}: {
  orgSlug: string;
  role: MembershipRole;
  pendingCount: number;
  collapsed?: boolean;
  demoMode?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = `/d/${orgSlug}`;
  const q =
    demoMode && searchParams.toString() ? `?${searchParams.toString()}` : "";

  const filteredNav = navItems.filter((item) => {
    if (item.href === "/settings" && role === "agent") return false;
    if (item.href === "/reports" && role === "agent") return false;
    return true;
  });

  return (
    <nav className="flex-1 space-y-0.5 p-2">
      {filteredNav.map(({ href, label, icon: Icon, badge }) => {
        const path = `${base}${href}`;
        const active =
          href === "" ? pathname === base : pathname.startsWith(path);
        const hrefWithQuery = `${path}${q}`;

        return (
          <Link
            key={href}
            href={hrefWithQuery}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200",
              active
                ? "bg-green-100 text-green-800 shadow-sm"
                : "text-muted hover:translate-x-0.5 hover:bg-surface-subtle hover:text-foreground",
              collapsed && "justify-center px-2 hover:translate-x-0"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
            {!collapsed && badge && pendingCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardSidebar({
  orgSlug,
  role,
  userName,
  userInitials,
  pendingCount = 0,
  collapsed,
  mobileOpen,
  demoMode = false,
  onCloseMobile,
  onToggleCollapse,
}: {
  orgSlug: string;
  role: MembershipRole;
  userName: string;
  userInitials: string;
  pendingCount?: number;
  collapsed: boolean;
  mobileOpen: boolean;
  demoMode?: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
}) {
  const base = `/d/${orgSlug}`;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] transition-opacity duration-300 animate-fade-in lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close menu"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-white shadow-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:shadow-none",
          collapsed ? "w-[4.25rem]" : "w-56",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-12 items-center justify-between border-b border-border px-2.5">
          {!collapsed ? (
            <Logo href={base} />
          ) : (
            <Link
              href={base}
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-green-500 text-xs font-bold text-white"
            >
              C
            </Link>
          )}
          <button
            type="button"
            onClick={onCloseMobile}
            className="btn-icon lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <NavLinks
          orgSlug={orgSlug}
          role={role}
          pendingCount={pendingCount}
          collapsed={collapsed}
          demoMode={demoMode}
          onNavigate={onCloseMobile}
        />

        <div className="mt-auto border-t border-border p-2">
          {!collapsed && (
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-800">
                {userInitials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {userName}
                </p>
                <p className="truncate text-[11px] capitalize text-muted">
                  {role}
                </p>
              </div>
            </div>
          )}
          {!canAddUnits(role) && role === "manager" && !collapsed && (
            <p className="mb-2 px-1 text-[10px] text-muted-foreground">
              Manager — cannot add units
            </p>
          )}
          {!demoMode && !collapsed && (
            <form action={signOutAction} className="mb-2">
              <button type="submit" className="btn-ghost w-full py-1.5 text-xs">
                Sign out
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "hidden w-full items-center gap-2 rounded-md border border-border px-2.5 py-2 text-xs text-muted hover:bg-surface-subtle lg:flex",
              collapsed && "justify-center"
            )}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

export function DashboardTopBar({
  onOpenSidebar,
  title,
  demoMode = false,
}: {
  onOpenSidebar: () => void;
  title?: string;
  demoMode?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-11 items-center gap-2 border-b border-border bg-white/90 px-3 backdrop-blur-md transition-shadow lg:hidden">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="btn-icon"
        aria-label="Open menu"
      >
        <PanelLeft className="h-4 w-4" />
      </button>
      {title && <span className="truncate text-sm font-semibold">{title}</span>}
      {!demoMode && (
        <form action={signOutAction} className="ml-auto">
          <button type="submit" className="text-xs font-medium text-muted">
            Sign out
          </button>
        </form>
      )}
    </header>
  );
}

export function DashboardMobileNav({
  orgSlug,
  pendingCount = 0,
  demoMode = false,
}: {
  orgSlug: string;
  pendingCount?: number;
  demoMode?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = `/d/${orgSlug}`;
  const q =
    demoMode && searchParams.toString() ? `?${searchParams.toString()}` : "";

  const items = [
    { href: "", label: "Home", icon: LayoutDashboard },
    { href: "/units", label: "Units", icon: Building2 },
    { href: "/payments", label: "Pay", icon: CreditCard, badge: pendingCount },
    { href: "/documents", label: "Docs", icon: FileText },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white/95 backdrop-blur-md lg:hidden">
      <div className="flex h-14 items-stretch">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const path = `${base}${href}`;
          const active =
            href === "" ? pathname === base : pathname.startsWith(path);

          return (
            <Link
              key={href}
              href={`${path}${q}`}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-all duration-200",
                active ? "text-green-700" : "text-muted hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  active && "scale-110"
                )}
              />
              {label}
              {badge ? (
                <span className="absolute right-[18%] top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500 px-0.5 text-[8px] font-bold text-white">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
