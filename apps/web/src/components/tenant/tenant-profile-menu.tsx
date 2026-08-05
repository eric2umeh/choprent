"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, LogOut, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function TenantProfileMenu({
  orgSlug,
  tenantName,
}: {
  orgSlug: string;
  tenantName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const base = `/t/${orgSlug}`;
  const accountPath = `${base}/account`;
  const initials =
    tenantName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "interactive-lift flex h-9 w-9 items-center justify-center rounded-full border border-border bg-green-50 text-xs font-semibold text-green-800 hover:bg-green-100",
          open && "ring-2 ring-green-200"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">
              {tenantName}
            </p>
            <p className="text-[11px] text-muted">Tenant account</p>
          </div>
          <Link
            href={accountPath}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-surface-subtle"
            onClick={() => setOpen(false)}
          >
            <UserRound className="h-4 w-4 text-muted" />
            View profile
          </Link>
          <Link
            href={`${accountPath}?tab=password`}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-surface-subtle"
            onClick={() => setOpen(false)}
          >
            <KeyRound className="h-4 w-4 text-muted" />
            Change password
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
