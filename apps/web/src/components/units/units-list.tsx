"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { formatPropertyType } from "@/lib/data/unit-types";
import { formatNaira } from "@/lib/auth/roles";
import { Plus } from "lucide-react";
import { unitPath, propertyPath } from "@/lib/routes/dashboard-paths";

function statusVariant(status: string) {
  if (status === "occupied") return "success" as const;
  if (status === "vacant") return "muted" as const;
  return "warning" as const;
}

export function UnitsList({
  orgSlug,
  propertyId,
  propertySlug,
  canAdd,
  units,
  onAddUnit,
}: {
  orgSlug: string;
  propertyId: string;
  propertySlug: string;
  canAdd: boolean;
  units: UnitListItem[];
  onAddUnit?: () => void;
}) {
  const router = useRouter();

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

  const showPropertyColumn = useMemo(
    () => new Set(units.map((unit) => unit.propertyName).filter(Boolean)).size > 1,
    [units]
  );

  const columns: Column<UnitListItem>[] = [
    {
      key: "unit",
      header: "Unit",
      mobilePrimary: true,
      render: (u) => (
        <span className="text-table-cell-strong">{u.unitCode}</span>
      ),
    },
    ...(showPropertyColumn
      ? [
          {
            key: "property",
            header: "Property",
            render: (u: UnitListItem) => (
              <span className="text-table-cell-muted">{u.propertyName ?? "—"}</span>
            ),
          } satisfies Column<UnitListItem>,
        ]
      : []),
    {
      key: "type",
      header: "Type",
      mobilePrimary: true,
      render: (u) => (
        <span className="text-table-cell-muted capitalize">
          {formatPropertyType(u.propertyType)}
        </span>
      ),
    },
    {
      key: "tenant",
      header: "Tenant",
      mobilePrimary: true,
      render: (u) => (
        <span className="text-table-cell">{u.tenantName ?? "—"}</span>
      ),
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
        <span className="text-money">
          {u.annualRent > 0 ? formatNaira(u.annualRent) : "—"}
        </span>
      ),
    },
    {
      key: "arrears",
      header: "Arrears",
      render: (u) => (
        <span className={u.arrears > 0 ? "text-money-negative" : "text-table-cell-muted"}>
          {u.arrears > 0 ? formatNaira(u.arrears) : "—"}
        </span>
      ),
    },
    {
      key: "dva",
      header: "Shop account",
      render: (u) => (
        <span className="font-mono text-[11px] text-table-cell-muted">
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
          {canAdd && onAddUnit && (
            <button
              type="button"
              onClick={onAddUnit}
              className="btn-primary inline-flex gap-1.5 px-3 py-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add unit
            </button>
          )}
          {canAdd && !onAddUnit && (
            <Link
              href={`${propertyPath(orgSlug, propertySlug)}/units/new`}
              className="btn-primary inline-flex gap-1.5 px-3 py-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add unit
            </Link>
          )}
        </div>
      </ListToolbar>

      <ListPanel>
        {view === "table" ? (
          <ResponsiveDataTable
            rows={slice}
            columns={columns}
            onRowClick={(u) =>
              router.push(unitPath(orgSlug, propertySlug, u.unitCode))
            }
            emptyMessage="No units match your filters"
          />
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {slice.map((unit) => (
              <CompactCard
                key={unit.id}
                onClick={() =>
                  router.push(unitPath(orgSlug, propertySlug, unit.unitCode))
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-list-primary">{unit.unitCode}</p>
                    <p className="mt-0.5 text-list-secondary capitalize">
                      {formatPropertyType(unit.propertyType)}
                    </p>
                    {showPropertyColumn && unit.propertyName && (
                      <p className="mt-0.5 text-list-meta">{unit.propertyName}</p>
                    )}
                  </div>
                  <Badge variant={statusVariant(unit.status)}>
                    {unit.status}
                  </Badge>
                </div>
                <p className="mt-2 truncate text-list-secondary">
                  {unit.tenantName ?? "Vacant"}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-money">
                    {unit.annualRent > 0 ? formatNaira(unit.annualRent) : "—"}
                  </span>
                  {unit.arrears > 0 && (
                    <span className="text-money-negative">
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
