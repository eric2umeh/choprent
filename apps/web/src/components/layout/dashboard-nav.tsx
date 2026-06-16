"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  Landmark,
  Receipt,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import type { MembershipRole } from "@/types/database";
import { canAddUnits } from "@/lib/auth/roles";
import { signOutAction } from "@/lib/actions/auth";

const navItems = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/properties",
    label: "Properties & units",
    icon: Building2,
    hint: "Add shops and units inside each property",
  },
  { href: "/tenants", label: "Tenants", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard, badge: true },
  { href: "/expenses", label: "Expenses", icon: Receipt, comingSoon: true },
  { href: "/analytics", label: "Analytics", icon: TrendingUp, comingSoon: true },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/account", label: "Account", icon: Landmark },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({
  orgSlug,
  role,
  pendingCount,
  collapsed,
  onNavigate,
}: {
  orgSlug: string;
  role: MembershipRole;
  pendingCount: number;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/d/${orgSlug}`;

  const filteredNav = navItems.filter((item) => {
    if (collapsed && item.href === "") return false;
    if (item.href === "/settings" && role === "agent") return false;
    if (item.href === "/account" && role === "agent") return false;
    if (item.href === "/reports" && role === "agent") return false;
    if (item.href === "/expenses" && role === "agent") return false;
    if (item.href === "/analytics" && role === "agent") return false;
    return true;
  });

  return (
    <nav className="flex-1 space-y-0.5 p-2.5">
      {filteredNav.map(({ href, label, icon: Icon, badge, hint, comingSoon }) => {
        const path = `${base}${href}`;
        const active =
          href === "" ? pathname === base : pathname.startsWith(path);

        return (
          <Link
            key={href}
            href={path}
            onClick={onNavigate}
            title={collapsed ? label : hint ?? label}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-green-100 text-green-800 shadow-sm"
                : "text-muted hover:translate-x-0.5 hover:bg-surface-subtle hover:text-foreground",
              collapsed && "justify-center px-2.5 hover:translate-x-0",
              comingSoon && !active && "opacity-90"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate">{label}</span>
                {hint && (
                  <span className="block truncate text-[11px] font-normal text-muted">
                    {hint}
                  </span>
                )}
              </span>
            )}
            {!collapsed && badge && pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
            {!collapsed && comingSoon && (
              <span className="shrink-0 rounded bg-surface-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Soon
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
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
}) {
  const base = `/d/${orgSlug}`;
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const handleHeaderClose = () => {
    if (isDesktop) {
      onToggleCollapse();
      return;
    }
    onCloseMobile();
  };

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
          collapsed ? "w-[4.5rem]" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div
          className={cn(
            "border-b border-border",
            collapsed
              ? "flex flex-col items-center gap-2.5 px-2 py-3"
              : "flex h-14 items-center justify-between px-3"
          )}
        >
          {collapsed ? (
            <>
              <Link
                href={base}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500 text-lg font-bold text-white shadow-sm transition hover:bg-green-600"
                title="ChopRent home"
              >
                C
              </Link>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-surface-subtle hover:text-foreground"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <Logo href={base} />
              <button
                type="button"
                onClick={handleHeaderClose}
                className="btn-icon shrink-0"
                aria-label={isDesktop ? "Collapse sidebar" : "Close menu"}
              >
                <X className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        <NavLinks
          orgSlug={orgSlug}
          role={role}
          pendingCount={pendingCount}
          collapsed={collapsed}
          onNavigate={onCloseMobile}
        />

        <div className="mt-auto border-t border-border p-2">
          {!collapsed && (
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-800">
                {userInitials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {userName}
                </p>
                <p className="truncate text-xs capitalize text-muted">
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
          {!collapsed && (
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
              "hidden w-full items-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm text-muted hover:bg-surface-subtle lg:flex",
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
}: {
  onOpenSidebar: () => void;
  title?: string;
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
      <form action={signOutAction} className="ml-auto">
        <button type="submit" className="text-xs font-medium text-muted">
          Sign out
        </button>
      </form>
    </header>
  );
}

export function DashboardMobileNav({
  orgSlug,
  pendingCount = 0,
}: {
  orgSlug: string;
  pendingCount?: number;
}) {
  const pathname = usePathname();
  const base = `/d/${orgSlug}`;

  const items = [
    { href: "", label: "Home", icon: LayoutDashboard },
    { href: "/properties", label: "Properties", icon: Building2 },
    { href: "/payments", label: "Pay", icon: CreditCard, badge: pendingCount },
    { href: "/tenants", label: "Tenants", icon: Users },
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
              href={path}
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
