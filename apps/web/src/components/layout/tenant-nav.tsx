"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, HelpCircle, Home, Receipt, Wallet } from "lucide-react";
import { TenantProfileMenu } from "@/components/tenant/tenant-profile-menu";
import { cn } from "@/lib/utils";

export function TenantMobileNav({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const base = `/t/${orgSlug}`;

  const items = [
    { href: "", label: "Home", icon: Home },
    { href: "/pay", label: "Pay", icon: Wallet },
    { href: "/ledger", label: "Transactions", icon: Receipt },
    { href: "/help", label: "Help", icon: HelpCircle },
    { href: "/documents", label: "Docs", icon: FileText },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white/95 backdrop-blur-md">
      <div className="flex h-16 items-stretch">
        {items.map(({ href, label, icon: Icon }) => {
          const path = `${base}${href}`;
          const active =
            href === "" ? pathname === base : pathname.startsWith(path);

          return (
            <Link
              key={href}
              href={path}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all duration-200",
                active ? "text-green-700" : "text-muted hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  active && "scale-110"
                )}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TenantHeader({
  orgSlug,
  tenantName,
  unitCode,
  orgDisplayName,
  propertyLogoUrl,
  propertyName,
}: {
  orgSlug: string;
  tenantName: string;
  unitCode: string;
  orgDisplayName: string;
  propertyLogoUrl?: string | null;
  propertyName?: string | null;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {propertyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={propertyLogoUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500 text-sm font-bold text-white">
              {(propertyName ?? orgDisplayName).charAt(0).toUpperCase()}
            </span>
          )}
          <div className="animate-fade-in min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {propertyName ?? orgDisplayName}
            </p>
            <p className="truncate text-[11px] text-muted">
              Shop {unitCode} · {tenantName}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/t/${orgSlug}/help`}
            className="interactive-lift rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-subtle"
          >
            Help
          </Link>
          <TenantProfileMenu orgSlug={orgSlug} tenantName={tenantName} />
        </div>
      </div>
    </header>
  );
}
