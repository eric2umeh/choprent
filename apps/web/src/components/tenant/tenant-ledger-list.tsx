"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CompactCard } from "@/components/ui/card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPanel, ListToolbar } from "@/components/ui/page-header";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { ResponsiveDataTable, type Column } from "@/components/ui/responsive-table";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { MOCK_TENANT_LEDGER, type MockLedgerLine } from "@/lib/mock/data";
import { formatNaira } from "@/lib/auth/roles";

function kindVariant(kind: MockLedgerLine["kind"]) {
  if (kind === "payment") return "success" as const;
  if (kind === "arrears") return "warning" as const;
  return "muted" as const;
}

export function TenantLedgerList({ balance }: { balance: number }) {
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");

  const filtered = useMemo(() => {
    return MOCK_TENANT_LEDGER.filter((line) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q || line.description.toLowerCase().includes(q);
      const matchKind = kindFilter === "all" || line.kind === kindFilter;
      return matchSearch && matchKind;
    });
  }, [search, kindFilter]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(
    filtered,
    6
  );

  const columns: Column<MockLedgerLine>[] = [
    {
      key: "desc",
      header: "Description",
      mobilePrimary: true,
      render: (l) => (
        <span className="text-sm font-medium text-foreground">{l.description}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      mobilePrimary: true,
      render: (l) => (
        <span
          className={`text-sm font-semibold ${
            l.amount < 0 ? "text-green-700" : "text-foreground"
          }`}
        >
          {l.amount < 0 ? "−" : ""}
          {formatNaira(Math.abs(l.amount))}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      mobilePrimary: true,
      render: (l) => <span className="text-cell-muted">{l.date}</span>,
    },
    {
      key: "kind",
      header: "Type",
      render: (l) => (
        <Badge variant={kindVariant(l.kind)} className="capitalize">
          {l.kind}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <div className="border-b border-border bg-white px-3 py-2.5">
        <p className="text-label normal-case">Current balance</p>
        <p className="text-lg font-bold text-foreground">{formatNaira(balance)}</p>
      </div>

      <ListToolbar>
        <FilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search ledger…"
        >
          <FilterSelect
            label="Type"
            value={kindFilter}
            onChange={(v) => {
              setKindFilter(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All types" },
              { value: "charge", label: "Charge" },
              { value: "payment", label: "Payment" },
              { value: "arrears", label: "Arrears" },
            ]}
          />
        </FilterBar>
        <div className="px-3 lg:px-0">
          <ViewToggle value={view} onChange={setView} />
        </div>
      </ListToolbar>

      <ListPanel>
        {view === "table" ? (
          <ResponsiveDataTable
            rows={slice}
            columns={columns}
            emptyMessage="No ledger entries match your filters"
          />
        ) : (
          <div className="grid gap-2 p-3">
            {slice.map((line) => (
              <CompactCard key={line.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{line.description}</p>
                    <p className="text-cell-muted">{line.date}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-semibold ${
                        line.amount < 0 ? "text-green-700" : "text-foreground"
                      }`}
                    >
                      {line.amount < 0 ? "−" : ""}
                      {formatNaira(Math.abs(line.amount))}
                    </p>
                    <Badge variant={kindVariant(line.kind)} className="mt-1 capitalize">
                      {line.kind}
                    </Badge>
                  </div>
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
