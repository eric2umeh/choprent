"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/tenants", id: "tenancies", label: "Current" },
  { href: "/tenants/former", id: "former", label: "Former" },
  { href: "/tenants/portal", id: "portal", label: "App accounts" },
] as const;

export function TenantsSectionTabs({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const base = `/d/${orgSlug}`;

  return (
    <div
      className="mb-4 flex gap-1 overflow-x-auto border-b border-border bg-white px-1"
      role="tablist"
    >
      {TABS.map((tab) => {
        const path = `${base}${tab.href}`;
        const active =
          tab.id === "tenancies"
            ? pathname === path
            : pathname === path || pathname.startsWith(`${path}/`);

        return (
          <Link
            key={tab.id}
            href={path}
            role="tab"
            aria-selected={active}
            className={cn(
              "relative shrink-0 px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "text-green-800" : "text-muted hover:text-foreground"
            )}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-green-600" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
