"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

const STAFF_SECTION_TITLES: Record<string, string> = {
  "": "Dashboard",
  tenants: "Tenants",
  properties: "Units & properties",
  units: "Units & properties",
  payments: "Payments",
  expenses: "Expenses",
  analytics: "Analytics",
  reports: "Reports",
  insights: "Insights",
  users: "Users & roles",
  account: "Account",
  settings: "Settings",
  documents: "Documents",
  leases: "Tenants",
};

const TENANT_SECTION_TITLES: Record<string, string> = {
  "": "Home",
  pay: "Pay",
  ledger: "Transactions",
  documents: "Documents",
  help: "Help",
  account: "Account",
};

function titleFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "login") return "Sign in";
  if (parts[0] === "d" && parts.length >= 2) {
    const section = parts[2] ?? "";
    if (section === "tenants" && parts[3] === "former") return "Former tenants";
    if (section === "tenants" && parts[3] === "portal") return "Portal tenants";
    if (section === "tenants" && parts[3] && parts[3] !== "former" && parts[3] !== "portal") {
      return "Tenant";
    }
    if (section === "properties" && parts[3]) {
      if (parts[4] === "units" && parts[5]) {
        return `Unit ${decodeURIComponent(parts[5])}`;
      }
      return "Property";
    }
    return STAFF_SECTION_TITLES[section] ?? "Dashboard";
  }
  if (parts[0] === "t" && parts.length >= 2) {
    const section = parts[2] ?? "";
    return TENANT_SECTION_TITLES[section] ?? "Home";
  }
  return null;
}

function applyDocumentTitle(pageTitle: string) {
  document.title =
    pageTitle === "ChopRent" ? "ChopRent" : `${pageTitle} · ChopRent`;
}

type SetTitle = (title: string | null) => void;

const DocumentTitleContext = createContext<SetTitle>(() => {});

/**
 * Keeps the browser tab / history entry title in sync on client navigations.
 * Server `metadata` alone is not always applied after soft route changes.
 */
export function DocumentTitleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [override, setOverride] = useState<string | null>(null);
  const overridePathRef = useRef<string | null>(null);

  const setTitle = useCallback(
    (title: string | null) => {
      if (title?.trim()) {
        overridePathRef.current = pathname;
        setOverride(title.trim());
        return;
      }
      overridePathRef.current = null;
      setOverride(null);
    },
    [pathname]
  );

  useEffect(() => {
    const activeOverride =
      override && overridePathRef.current === pathname ? override : null;
    const pageTitle = activeOverride || titleFromPath(pathname) || "ChopRent";
    applyDocumentTitle(pageTitle);
  }, [pathname, override]);

  return (
    <DocumentTitleContext.Provider value={setTitle}>
      {children}
    </DocumentTitleContext.Provider>
  );
}

/** Override the tab title for detail pages (tenant name, property name, etc.). */
export function useDocumentTitle(title: string | null | undefined) {
  const setTitle = useContext(DocumentTitleContext);

  useEffect(() => {
    if (!title?.trim()) return;
    setTitle(title.trim());
    return () => setTitle(null);
  }, [title, setTitle]);
}
