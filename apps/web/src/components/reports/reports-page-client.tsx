"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  exportTenantActivityPack,
  exportPaymentsCsv,
  exportUnitsCsv,
  saveReportSnapshot,
} from "@/lib/actions/reports";
import type { TenantActivitySnapshot } from "@/lib/data/tenant-activity";
import { formatNaira } from "@/lib/auth/roles";
import { formatDisplayDate } from "@/lib/utils/format-date";
import { StatCard } from "@/components/ui/card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPanel, ListToolbar } from "@/components/ui/page-header";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { ResponsiveDataTable, type Column } from "@/components/ui/responsive-table";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Download, Camera, Save } from "lucide-react";

type SavedSnapshot = {
  id: string;
  snapshot_date: string;
  units_registered: number;
  tenants_self_served: number;
  verified_total_ngn: number;
  collection_rate_pct: number | null;
};

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function boolBadge(value: boolean) {
  return (
    <Badge variant={value ? "success" : "muted"}>{value ? "Yes" : "—"}</Badge>
  );
}

function defaultDateRange() {
  const year = new Date().getFullYear();
  return {
    from: `${year}-01-01`,
    to: new Date().toISOString().slice(0, 10),
  };
}

export function ReportsPageClient({
  orgSlug,
  activity,
  snapshots,
  canExport,
}: {
  orgSlug: string;
  activity: TenantActivitySnapshot;
  snapshots: SavedSnapshot[];
  canExport: boolean;
}) {
  const router = useRouter();
  const [exporting, setExporting] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const defaults = defaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [search, setSearch] = useState("");
  const [selfServeFilter, setSelfServeFilter] = useState("all");

  const filteredRows = useMemo(() => {
    return activity.selfServiceRows.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.tenantName.toLowerCase().includes(q) ||
        r.unitCode.toLowerCase().includes(q);

      const matchSelfServe =
        selfServeFilter === "all" ||
        (selfServeFilter === "yes" && r.qualifiesSelfServing) ||
        (selfServeFilter === "no" && !r.qualifiesSelfServing);

      const activityDay = r.lastActivityAt?.slice(0, 10) ?? null;
      const matchDate =
        !activityDay ||
        ((!dateFrom || activityDay >= dateFrom) && (!dateTo || activityDay <= dateTo));

      return matchSearch && matchSelfServe && matchDate;
    });
  }, [activity.selfServiceRows, search, selfServeFilter, dateFrom, dateTo]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(filteredRows);

  function handleExport(
    kind: "payments" | "units" | "pack",
    fn: () => Promise<{ error?: string; csv?: string; json?: string; filename?: string }>
  ) {
    setExporting(kind);
    startTransition(async () => {
      const result = await fn();
      setExporting(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.csv && kind === "pack" && result.json) {
        downloadText(result.csv, `${result.filename}_tenants.csv`, "text/csv");
        downloadText(result.json, `${result.filename}.json`, "application/json");
        toast.success("Report pack downloaded (CSV + JSON).");
      } else if (result.csv) {
        downloadText(
          result.csv,
          result.filename ??
            (kind === "payments"
              ? `payments_export_${dateFrom}_to_${dateTo}.csv`
              : `units_export_${dateFrom}_to_${dateTo}.csv`),
          "text/csv"
        );
        toast.success("Export downloaded.");
      }
    });
  }

  function handleSaveSnapshot() {
    startTransition(async () => {
      const result = await saveReportSnapshot(orgSlug);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Today's report snapshot saved.");
        router.refresh();
      }
    });
  }

  const columns: Column<TenantActivitySnapshot["selfServiceRows"][number]>[] = [
    {
      key: "tenant",
      header: "Tenant",
      mobilePrimary: true,
      render: (r) => <span className="text-table-cell">{r.tenantName}</span>,
    },
    {
      key: "unit",
      header: "Unit",
      mobilePrimary: true,
      render: (r) => <span className="text-table-cell-strong">{r.unitCode}</span>,
    },
    {
      key: "receipt",
      header: "Receipt",
      render: (r) => boolBadge(r.uploadedReceipt),
    },
    {
      key: "ledger",
      header: "Ledger",
      render: (r) => boolBadge(r.viewedLedger),
    },
    {
      key: "docs",
      header: "Documents",
      render: (r) => boolBadge(r.downloadedDocument),
    },
    {
      key: "qualifies",
      header: "Self-serving",
      render: (r) => boolBadge(r.qualifiesSelfServing),
    },
    {
      key: "lastActivity",
      header: "Last activity",
      render: (r) => (
        <span className="text-table-cell-muted tabular-nums">
          {r.lastActivityAt ? formatDisplayDate(r.lastActivityAt) : "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 border-b border-border bg-white px-3 py-3 xl:grid-cols-4">
        <StatCard
          label="Self-serving tenants"
          value={String(activity.tenantsSelfServing)}
          hint={`${activity.tenantsWithProfiles} with login`}
        />
        <StatCard
          label="Collection rate"
          value={`${activity.collectionRatePct}%`}
          hint={`${activity.year} YTD`}
        />
        <StatCard
          label="Verified this month"
          value={formatNaira(activity.verifiedTotalNgnThisMonth)}
          hint={`${activity.verifiedPaymentsThisMonth} payments`}
        />
        <StatCard
          label="Arrears"
          value={formatNaira(activity.arrearsNgn)}
          hint="Outstanding balances"
        />
      </div>

      {canExport && (
        <div className="space-y-3 border-b border-border bg-white px-3 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-label normal-case">From</label>
              <input
                type="date"
                className="input-field mt-1"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-label normal-case">To</label>
              <input
                type="date"
                className="input-field mt-1"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5"
              disabled={exporting !== null}
              onClick={() => handleExport("pack", () => exportTenantActivityPack(orgSlug))}
            >
              {exporting === "pack" ? (
                <Spinner size="sm" className="text-white" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download report pack
            </button>
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5"
              disabled={exporting !== null}
              onClick={() =>
                handleExport("payments", () =>
                  exportPaymentsCsv(orgSlug, dateFrom, dateTo)
                )
              }
            >
              Print Payments
            </button>
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5"
              disabled={exporting !== null}
              onClick={() =>
                handleExport("units", () => exportUnitsCsv(orgSlug, dateFrom, dateTo))
              }
            >
              Print Units
            </button>
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5"
              onClick={handleSaveSnapshot}
            >
              <Save className="h-4 w-4" />
              Save snapshot
            </button>
          </div>
        </div>
      )}

      <ListToolbar>
        <FilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search tenant or unit…"
        >
          <FilterSelect
            label="Self-serving"
            value={selfServeFilter}
            onChange={(v) => {
              setSelfServeFilter(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </FilterBar>
      </ListToolbar>

      <ListPanel>
        <h2 className="border-b border-border px-3 py-3 text-card-title">
          Tenant self-service activity
        </h2>
        <ResponsiveDataTable
          rows={slice}
          columns={columns}
          emptyMessage="No active leases in this date range."
        />
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filteredRows.length}
          pageSize={pageSize}
        />
      </ListPanel>

      <div className="border-b border-border bg-white px-3 py-4">
        <h2 className="text-card-title">Monthly reports checklist</h2>
        <ul className="mt-3 space-y-2 text-list-secondary">
          <li>
            ✓ Units registered: <span className="text-list-primary">{activity.unitsRegistered}</span> — Print Units
          </li>
          <li>
            ✓ Tenants self-serving: <span className="text-list-primary">{activity.tenantsSelfServing}</span> — download
            report pack
          </li>
          <li>
            ✓ Verified ₦ this month:{" "}
            <span className="text-list-primary">{formatNaira(activity.verifiedTotalNgnThisMonth)}</span> — Print Payments
          </li>
          <li>
            ✓ Collection rate: <span className="text-list-primary">{activity.collectionRatePct}%</span> — screenshot this page
          </li>
          <li className="flex items-center gap-2">
            <Camera className="h-4 w-4 shrink-0 text-muted" />
            Screenshot dashboard + tenant mobile pay flow
          </li>
        </ul>
        <p className="mt-4 text-list-meta">
          Store exports in your monthly reports folder (see{" "}
          <code className="text-xs">docs/02_monthly_reports_checklist.md</code>). Use{" "}
          <span className="text-section-link">Save snapshot</span> to keep a dated record in the database.
        </p>
      </div>

      {snapshots.length > 0 && (
        <ListPanel>
          <h2 className="border-b border-border px-3 py-3 text-card-title">
            Saved snapshots
          </h2>
          <ul className="divide-y divide-border">
            {snapshots.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
                <span className="text-list-primary tabular-nums">
                  {formatDisplayDate(s.snapshot_date)}
                </span>
                <span className="text-list-secondary">
                  {s.tenants_self_served} self-serving · {s.units_registered} units ·{" "}
                  {s.collection_rate_pct ?? "—"}% collected
                </span>
              </li>
            ))}
          </ul>
        </ListPanel>
      )}
    </>
  );
}
