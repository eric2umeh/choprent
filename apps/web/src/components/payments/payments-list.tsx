"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CompactCard } from "@/components/ui/card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPanel, ListToolbar } from "@/components/ui/page-header";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { ResponsiveDataTable, type Column } from "@/components/ui/responsive-table";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { MOCK_PAYMENTS, type MockPayment } from "@/lib/mock/data";
import { formatNaira } from "@/lib/auth/roles";
import { Check, X } from "lucide-react";

function methodLabel(m: string) {
  const map: Record<string, string> = {
    bank_transfer: "Transfer",
    cash_recorded: "Cash",
    dedicated_account: "DVA",
  };
  return map[m] ?? m;
}

function statusBadge(status: string) {
  if (status === "verified") return "success" as const;
  if (status === "pending") return "warning" as const;
  return "danger" as const;
}

export function PaymentsList({ canVerify }: { canVerify: boolean }) {
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return MOCK_PAYMENTS.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.unitCode.toLowerCase().includes(q) ||
        p.tenantName.toLowerCase().includes(q) ||
        (p.bankReference?.toLowerCase().includes(q) ?? false);
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(
    filtered,
    8
  );

  const columns: Column<MockPayment>[] = [
    {
      key: "unit",
      header: "Unit",
      mobilePrimary: true,
      render: (p) => <span className="text-sm font-semibold">{p.unitCode}</span>,
    },
    {
      key: "tenant",
      header: "Tenant",
      mobilePrimary: true,
      render: (p) => <span className="text-cell">{p.tenantName}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      mobilePrimary: true,
      render: (p) => (
        <span className="text-sm font-semibold">{formatNaira(p.amount)}</span>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (p) => <span className="text-cell-muted">{p.periodLabel}</span>,
    },
    {
      key: "method",
      header: "Method",
      render: (p) => (
        <span className="text-cell-muted">{methodLabel(p.method)}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (p) => <span className="text-cell-muted">{p.paymentDate}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <Badge variant={statusBadge(p.status)}>{p.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (p) =>
        canVerify && p.status === "pending" ? (
          <div className="flex gap-1">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2 py-1 text-[11px] font-semibold text-white"
            >
              <Check className="h-3 w-3" />
              Verify
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null,
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
          searchPlaceholder="Search unit, tenant, ref…"
        >
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "verified", label: "Verified" },
            ]}
          />
        </FilterBar>
        <div className="flex items-center gap-2 px-3 lg:px-0">
          <ViewToggle value={view} onChange={setView} />
          {canVerify && (
            <button type="button" className="btn-primary px-3 py-1.5">
              Record cash
            </button>
          )}
        </div>
      </ListToolbar>

      <ListPanel>
        {view === "table" ? (
          <ResponsiveDataTable
            rows={slice}
            columns={columns}
            emptyMessage="No payments match your filters"
          />
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {slice.map((p) => (
              <CompactCard key={p.id}>
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {p.unitCode} · {p.tenantName}
                    </p>
                    <p className="text-xs font-semibold">{formatNaira(p.amount)}</p>
                    <p className="text-cell-muted">{p.periodLabel}</p>
                  </div>
                  <Badge variant={statusBadge(p.status)}>{p.status}</Badge>
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
