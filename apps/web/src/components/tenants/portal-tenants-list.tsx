"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/ui/filter-bar";
import { ListPanel, ListToolbar } from "@/components/ui/page-header";
import { Pagination, usePagination } from "@/components/ui/pagination";
import {
  ResponsiveDataTable,
  type Column,
} from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import type { PortalTenantListItem } from "@/lib/data/portal-tenants";
import { formatDisplayDate } from "@/lib/utils/format-date";

type PortalRow = PortalTenantListItem & { id: string };

export function PortalTenantsList({
  orgSlug,
  tenants,
}: {
  orgSlug: string;
  tenants: PortalTenantListItem[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const rows: PortalRow[] = useMemo(
    () => tenants.map((t) => ({ ...t, id: t.userId })),
    [tenants]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (t) =>
        t.tenantName.toLowerCase().includes(q) ||
        t.unitCode.toLowerCase().includes(q) ||
        t.propertyName.toLowerCase().includes(q) ||
        (t.email?.toLowerCase().includes(q) ?? false) ||
        (t.phone?.includes(q) ?? false)
    );
  }, [rows, search]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(filtered);

  const columns: Column<PortalRow>[] = [
    {
      key: "tenant",
      header: "Tenant",
      mobilePrimary: true,
      render: (t) => (
        <div>
          <span className="text-table-cell-strong">{t.tenantName}</span>
          {t.email ? (
            <span className="text-table-sub break-all">{t.email}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      render: (t) => (
        <div>
          <span className="text-table-cell-strong">{t.unitCode}</span>
          <span className="text-table-sub">{t.propertyName}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Portal",
      render: () => <Badge variant="success">Linked</Badge>,
    },
    {
      key: "activity",
      header: "Last activity",
      render: (t) => (
        <span className="text-table-cell-muted">
          {t.lastActivityAt
            ? formatDisplayDate(t.lastActivityAt.slice(0, 10))
            : "—"}
        </span>
      ),
    },
    {
      key: "payments",
      header: "Payments",
      render: (t) => (
        <span className="text-table-cell">
          {t.pendingPayments > 0 ? (
            <span className="text-amber-700">{t.pendingPayments} pending</span>
          ) : (
            <span className="text-muted">{t.verifiedPayments} verified</span>
          )}
        </span>
      ),
    },
  ];

  return (
    <ListPanel>
      <ListToolbar>
        <FilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search name, unit, email…"
        />
        <p className="px-3 text-sm text-muted lg:px-0">
          {filtered.length} linked account{filtered.length === 1 ? "" : "s"}
        </p>
      </ListToolbar>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-foreground">No app-linked tenants yet</p>
          <p className="mt-1 text-sm text-muted">
            Invite a tenant from their tenancy page. Once they create a password,
            they appear here.
          </p>
        </div>
      ) : (
        <>
          <ResponsiveDataTable
            columns={columns}
            rows={slice}
            onRowClick={(t) =>
              router.push(`/d/${orgSlug}/tenants/portal/${t.userId}`)
            }
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            totalItems={filtered.length}
          />
        </>
      )}
    </ListPanel>
  );
}
