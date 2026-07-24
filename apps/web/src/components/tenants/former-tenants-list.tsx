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
import type { LeaseListItem } from "@/lib/data/leases";
import { formatDateRange, formatDisplayDate } from "@/lib/utils/format-date";

export function FormerTenantsList({
  orgSlug,
  leases,
}: {
  orgSlug: string;
  leases: LeaseListItem[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return leases;
    return leases.filter(
      (l) =>
        l.tenantName.toLowerCase().includes(q) ||
        l.unitCode.toLowerCase().includes(q) ||
        l.propertyName.toLowerCase().includes(q) ||
        (l.tenantEmail?.toLowerCase().includes(q) ?? false)
    );
  }, [leases, search]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(filtered);

  const columns: Column<LeaseListItem>[] = [
    {
      key: "tenant",
      header: "Tenant",
      mobilePrimary: true,
      render: (l) => (
        <div>
          <span className="text-table-cell-strong">{l.tenantName}</span>
          {l.tenantPhone ? (
            <span className="text-table-sub tabular-nums">{l.tenantPhone}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      render: (l) => (
        <div>
          <span className="text-table-cell-strong">{l.unitCode}</span>
          <span className="text-table-sub">{l.propertyName}</span>
        </div>
      ),
    },
    {
      key: "term",
      header: "Term",
      render: (l) => (
        <span className="text-table-cell-muted">
          {formatDateRange(l.startDate, l.endDate)}
        </span>
      ),
    },
    {
      key: "ended",
      header: "Ended",
      render: (l) => (
        <span className="text-table-cell-muted">
          {formatDisplayDate(l.endDate)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (l) => (
        <Badge variant="muted">{l.status === "renewed" ? "renewed" : "ended"}</Badge>
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
          searchPlaceholder="Search former tenant, unit…"
        />
        <p className="px-3 text-sm text-muted lg:px-0">
          {filtered.length} former tenanc{filtered.length === 1 ? "y" : "ies"}
        </p>
      </ListToolbar>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-foreground">No former tenants yet</p>
          <p className="mt-1 text-sm text-muted">
            When you end a tenancy, it moves here and leaves Current tenants.
          </p>
        </div>
      ) : (
        <>
          <ResponsiveDataTable
            columns={columns}
            rows={slice}
            onRowClick={(l) => router.push(`/d/${orgSlug}/tenants/${l.id}`)}
            emptyMessage="No former tenants match your search"
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
