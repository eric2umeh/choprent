"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CompactCard } from "@/components/ui/card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPanel, ListToolbar } from "@/components/ui/page-header";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { ResponsiveDataTable, type Column } from "@/components/ui/responsive-table";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { MOCK_LEASES, type MockLease } from "@/lib/mock/data";
import { formatNaira } from "@/lib/auth/roles";

export function LeasesList({ canManage }: { canManage: boolean }) {
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [cadenceFilter, setCadenceFilter] = useState("all");

  const filtered = useMemo(() => {
    return MOCK_LEASES.filter((l) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        l.unitCode.toLowerCase().includes(q) ||
        l.tenantName.toLowerCase().includes(q);
      const matchCadence =
        cadenceFilter === "all" || l.billingCadence === cadenceFilter;
      return matchSearch && matchCadence;
    });
  }, [search, cadenceFilter]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(
    filtered,
    8
  );

  const columns: Column<MockLease>[] = [
    {
      key: "unit",
      header: "Unit",
      mobilePrimary: true,
      render: (l) => <span className="text-table-cell-strong">{l.unitCode}</span>,
    },
    {
      key: "tenant",
      header: "Tenant",
      mobilePrimary: true,
      render: (l) => <span className="text-table-cell">{l.tenantName}</span>,
    },
    {
      key: "total",
      header: "Annual total",
      mobilePrimary: true,
      render: (l) => <span className="text-money">{formatNaira(l.annualTotal)}</span>,
    },
    {
      key: "period",
      header: "Lease period",
      className: "w-[11.5rem]",
      render: (l) => (
        <span className="text-period-compact">
          {l.startDate} → {l.endDate}
        </span>
      ),
    },
    {
      key: "cadence",
      header: "Billing",
      render: (l) => (
        <span className="text-meta-pill capitalize">{l.billingCadence}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (l) => <Badge variant="success">{l.status}</Badge>,
    },
    {
      key: "phone",
      header: "Phone",
      render: (l) => <span className="text-table-cell-muted">{l.tenantPhone}</span>,
    },
  ];

  return (
    <>
      <ListToolbar>
        <FilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search unit or tenant…"
        >
          <FilterSelect
            label="Billing"
            value={cadenceFilter}
            onChange={(v) => {
              setCadenceFilter(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "annual", label: "Annual" },
              { value: "quarterly", label: "Quarterly" },
              { value: "monthly", label: "Monthly" },
            ]}
          />
        </FilterBar>
        <div className="flex items-center gap-2 px-3 lg:px-0">
          <ViewToggle value={view} onChange={setView} />
          {canManage && (
            <button type="button" className="btn-primary px-3 py-1.5">
              Assign tenant
            </button>
          )}
        </div>
      </ListToolbar>

      <ListPanel>
        {view === "table" ? (
          <ResponsiveDataTable
            rows={slice}
            columns={columns}
            emptyMessage="No leases match your filters"
          />
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {slice.map((l) => (
              <CompactCard key={l.id}>
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {l.unitCode} · {l.tenantName}
                    </p>
                    <p className="text-cell-muted capitalize">{l.billingCadence}</p>
                  </div>
                  <span className="text-xs font-semibold">
                    {formatNaira(l.annualTotal)}
                  </span>
                </div>
              </CompactCard>
            ))}
          </div>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filtered.length}
          pageSize={pageSize}
        />
      </ListPanel>
    </>
  );
}
