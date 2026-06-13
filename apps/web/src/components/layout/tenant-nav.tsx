"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, Receipt, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function TenantMobileNav({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const base = `/t/${orgSlug}`;

  const items = [
    { href: "", label: "Home", icon: Home },
    { href: "/pay", label: "Pay", icon: Wallet },
    { href: "/ledger", label: "Ledger", icon: Receipt },
    { href: "/documents", label: "Docs", icon: FileText },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white">
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
                "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium",
                active ? "text-green-700" : "text-muted"
              )}
            >
              <Icon className="h-5 w-5" />
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
}: {
  orgSlug: string;
  tenantName: string;
  unitCode: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-3">
        <div>
          <p className="text-sm font-semibold text-foreground">ChopRent</p>
          <p className="text-[11px] text-muted">
            Shop {unitCode} · {tenantName}
          </p>
        </div>
        <Link
          href={`/t/${orgSlug}/documents`}
          className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700"
        >
          Letters
        </Link>
      </div>
    </header>
  );
}
