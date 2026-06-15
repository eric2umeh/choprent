"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CompactCard } from "@/components/ui/card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPanel, ListToolbar } from "@/components/ui/page-header";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { ResponsiveDataTable, type Column } from "@/components/ui/responsive-table";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import type { LedgerLineItem } from "@/lib/data/ledger";
import { formatNaira } from "@/lib/auth/roles";

function kindVariant(kind: LedgerLineItem["kind"]) {
  if (kind === "payment") return "success" as const;
  if (kind === "adjustment") return "warning" as const;
  return "muted" as const;
}

export function TenantLedgerList({
  balance,
  lines,
}: {
  balance: number;
  lines: LedgerLineItem[];
}) {
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");

  const filtered = useMemo(() => {
    return lines.filter((line) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q || line.description.toLowerCase().includes(q);
      const matchKind = kindFilter === "all" || line.kind === kindFilter;
      return matchSearch && matchKind;
    });
  }, [lines, search, kindFilter]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(
    filtered,
    6
  );

  const columns: Column<LedgerLineItem>[] = [
    {
      key: "desc",
      header: "Description",
      mobilePrimary: true,
      render: (l) => (
        <span className="text-table-cell-strong">{l.description}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      mobilePrimary: true,
      render: (l) => (
        <span
          className={
            l.kind === "payment" ? "text-money text-green-700" : "text-money"
          }
        >
          {l.kind === "payment" ? "+" : "−"}
          {formatNaira(Math.abs(l.amount))}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      mobilePrimary: true,
      render: (l) => (
        <span className="text-table-cell-muted tabular-nums">{l.date}</span>
      ),
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
      <div className="stat-card mx-3 mt-3 border-b-0">
        <p className="text-stat-label">Outstanding balance</p>
        <p className="text-stat-value">{formatNaira(balance)}</p>
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
              { value: "adjustment", label: "Adjustment" },
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
                    <p className="text-list-primary">{line.description}</p>
                    <p className="mt-0.5 text-list-meta tabular-nums">{line.date}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={
                        line.kind === "payment"
                          ? "text-money text-green-700"
                          : "text-money"
                      }
                    >
                      {line.kind === "payment" ? "+" : "−"}
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
