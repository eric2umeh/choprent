"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CompactCard } from "@/components/ui/card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPanel, ListToolbar } from "@/components/ui/page-header";
import { Pagination, usePagination } from "@/components/ui/pagination";
import {
  ResponsiveDataTable,
  type Column,
} from "@/components/ui/responsive-table";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import type { UnitListItem } from "@/lib/data/unit-types";
import { formatPropertyType } from "@/lib/mock/data";
import { formatNaira } from "@/lib/auth/roles";
import { Plus } from "lucide-react";

function statusVariant(status: string) {
  if (status === "occupied") return "success" as const;
  if (status === "vacant") return "muted" as const;
  return "warning" as const;
}

export function UnitsList({
  orgSlug,
  canAdd,
  units,
  demoMode = false,
}: {
  orgSlug: string;
  canAdd: boolean;
  units: UnitListItem[];
  demoMode?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q =
    demoMode && searchParams.toString() ? `?${searchParams.toString()}` : "";

  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    return units.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        u.unitCode.toLowerCase().includes(q) ||
        (u.tenantName?.toLowerCase().includes(q) ?? false);
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      const matchType = typeFilter === "all" || u.propertyType === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [units, search, statusFilter, typeFilter]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(
    filtered,
    8,
  );

  const columns: Column<UnitListItem>[] = [
    {
      key: "unit",
      header: "Unit",
      mobilePrimary: true,
      render: (u) => (
        <span className="text-sm font-semibold text-foreground">
          {u.unitCode}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      mobilePrimary: true,
      render: (u) => (
        <span className="text-cell-muted capitalize">
          {formatPropertyType(u.propertyType)}
        </span>
      ),
    },
    {
      key: "tenant",
      header: "Tenant",
      mobilePrimary: true,
      render: (u) => <span className="text-cell">{u.tenantName ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <Badge variant={statusVariant(u.status)}>{u.status}</Badge>
      ),
    },
    {
      key: "rent",
      header: "Annual rent",
      render: (u) => (
        <span className="text-cell font-medium">
          {u.annualRent > 0 ? formatNaira(u.annualRent) : "—"}
        </span>
      ),
    },
    {
      key: "arrears",
      header: "Arrears",
      render: (u) => (
        <span
          className={
            u.arrears > 0
              ? "text-sm font-medium text-red-600"
              : "text-cell-muted"
          }
        >
          {u.arrears > 0 ? formatNaira(u.arrears) : "—"}
        </span>
      ),
    },
    {
      key: "dva",
      header: "Shop account",
      render: (u) => (
        <span className="text-cell-muted font-mono text-[11px]">
          {u.virtualAccount ?? "—"}
        </span>
      ),
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
            label="Status"
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All status" },
              { value: "occupied", label: "Occupied" },
              { value: "vacant", label: "Vacant" },
              { value: "maintenance", label: "Maintenance" },
            ]}
          />
          <FilterSelect
            label="Type"
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All types" },
              { value: "shop", label: "Shop" },
              { value: "flat", label: "Flat" },
              { value: "office", label: "Office" },
              { value: "restaurant", label: "Restaurant" },
            ]}
          />
        </FilterBar>
        <div className="flex items-center gap-2 px-3 lg:px-0">
          <ViewToggle value={view} onChange={setView} />
          {canAdd && (
            <Link
              href={`/d/${orgSlug}/units/new${q}`}
              className="btn-primary inline-flex gap-1.5 px-3 py-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Link>
          )}
        </div>
      </ListToolbar>

      <ListPanel>
        {view === "table" ? (
          <ResponsiveDataTable
            rows={slice}
            columns={columns}
            onRowClick={(u) => router.push(`/d/${orgSlug}/units/${u.id}${q}`)}
            emptyMessage="No units match your filters"
          />
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {slice.map((unit) => (
              <CompactCard
                key={unit.id}
                onClick={() =>
                  router.push(`/d/${orgSlug}/units/${unit.id}${q}`)
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{unit.unitCode}</p>
                    <p className="text-cell-muted capitalize">
                      {formatPropertyType(unit.propertyType)}
                    </p>
                  </div>
                  <Badge variant={statusVariant(unit.status)}>
                    {unit.status}
                  </Badge>
                </div>
                <p className="mt-1.5 truncate text-cell-muted">
                  {unit.tenantName ?? "Vacant"}
                </p>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {unit.annualRent > 0 ? formatNaira(unit.annualRent) : "—"}
                  </span>
                  {unit.arrears > 0 && (
                    <span className="text-red-600">
                      {formatNaira(unit.arrears)} due
                    </span>
                  )}
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
