"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CompactCard } from "@/components/ui/card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPanel, ListToolbar } from "@/components/ui/page-header";
import { Pagination, usePagination } from "@/components/ui/pagination";
import {
  ResponsiveDataTable,
  type Column,
} from "@/components/ui/responsive-table";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { LeaseForm } from "@/components/leases/lease-form";
import { TenantPaymentStatusBadge } from "@/components/tenants/tenant-payment-status-badge";
import type { LeaseListItem } from "@/lib/data/leases";
import type { SettlementAccountItem } from "@/lib/data/settlement-accounts";
import { formatNaira } from "@/lib/auth/roles";

export function LeasesList({
  orgSlug,
  leases,
  vacantUnits,
  settlementAccounts,
  canManage,
}: {
  orgSlug: string;
  leases: LeaseListItem[];
  vacantUnits: { id: string; unitCode: string; siteId: string }[];
  settlementAccounts: SettlementAccountItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [cadenceFilter, setCadenceFilter] = useState("all");
  const [rentStatusFilter, setRentStatusFilter] = useState("all");
  const [formMode, setFormMode] = useState<"create" | "renew" | "edit" | null>(
    null
  );
  const [activeLease, setActiveLease] = useState<LeaseListItem | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return leases.filter((l) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        l.unitCode.toLowerCase().includes(q) ||
        l.tenantName.toLowerCase().includes(q) ||
        l.propertyName.toLowerCase().includes(q);
      const matchCadence =
        cadenceFilter === "all" || l.billingCadence === cadenceFilter;
      const matchRentStatus =
        rentStatusFilter === "all" || l.paymentStatus === rentStatusFilter;
      return matchSearch && matchCadence && matchRentStatus;
    });
  }, [leases, search, cadenceFilter, rentStatusFilter]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(filtered);

  const columns: Column<LeaseListItem>[] = [
    {
      key: "unit",
      header: "Unit",
      mobilePrimary: true,
      render: (l) => (
        <span className="text-table-cell-strong">{l.unitCode}</span>
      ),
    },
    {
      key: "tenant",
      header: "Tenant",
      mobilePrimary: true,
      render: (l) => <span className="text-table-cell">{l.tenantName}</span>,
    },
    {
      key: "property",
      header: "Property",
      render: (l) => (
        <span className="text-table-cell-muted">{l.propertyName}</span>
      ),
    },
    {
      key: "total",
      header: "Annual rent",
      mobilePrimary: true,
      render: (l) => (
        <span className="text-money">{formatNaira(l.annualTotal)}</span>
      ),
    },
    {
      key: "collected",
      header: "Collected",
      render: (l) => (
        <span className="text-table-cell">{formatNaira(l.paidAmount)}</span>
      ),
    },
    {
      key: "rentStatus",
      header: "Rent status",
      render: (l) => <TenantPaymentStatusBadge status={l.paymentStatus} />,
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
      key: "phone",
      header: "Phone",
      render: (l) => (
        <span className="text-table-cell-muted">{l.tenantPhone ?? "—"}</span>
      ),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            render: (l: LeaseListItem) =>
              l.status === "active" ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn-ghost px-2 py-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      startTransition(() => {
                        setActiveLease(l);
                        setFormMode("edit");
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-2 py-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      startTransition(() => {
                        setActiveLease(l);
                        setFormMode("renew");
                      });
                    }}
                  >
                    Renew
                  </button>
                </div>
              ) : null,
          } satisfies Column<LeaseListItem>,
        ]
      : []),
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
          searchPlaceholder="Search unit, tenant, or property…"
        >
          <FilterSelect
            label="Rent status"
            value={rentStatusFilter}
            onChange={(v) => {
              setRentStatusFilter(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "paid", label: "Paid" },
              { value: "partial", label: "Partial" },
              { value: "debt", label: "In debt" },
            ]}
          />
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
            <button
              type="button"
              className="btn-primary px-3 py-1.5"
              onClick={() => setFormMode("create")}
            >
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
            onRowClick={(l) => router.push(`/d/${orgSlug}/tenants/${l.id}`)}
            emptyMessage="No tenants match your filters"
          />
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {slice.map((l) => (
              <CompactCard
                key={l.id}
                onClick={() => router.push(`/d/${orgSlug}/tenants/${l.id}`)}
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {l.unitCode} · {l.tenantName}
                    </p>
                    <p className="text-period-compact mt-0.5">
                      {l.startDate} → {l.endDate}
                    </p>
                    <p className="text-cell-muted capitalize">
                      {l.billingCadence}
                    </p>
                  </div>
                  <TenantPaymentStatusBadge status={l.paymentStatus} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    {formatNaira(l.annualTotal)}
                  </span>
                  <span className="text-list-secondary text-xs">
                    Collected {formatNaira(l.paidAmount)}
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

      {canManage && formMode && (
        <LeaseForm
          orgSlug={orgSlug}
          mode={formMode}
          lease={
            formMode === "renew" || formMode === "edit"
              ? (activeLease ?? undefined)
              : undefined
          }
          vacantUnits={vacantUnits}
          settlementAccounts={settlementAccounts}
          open={!!formMode}
          onClose={() => {
            setFormMode(null);
            setActiveLease(null);
          }}
        />
      )}
    </>
  );
}
