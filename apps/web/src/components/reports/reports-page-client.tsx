"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  exportTenantActivityPack,
  exportPaymentsCsv,
  exportUnitsCsv,
  saveReportSnapshot,
} from "@/lib/actions/reports";
import type { TenantActivitySnapshot } from "@/lib/data/tenant-activity";
import { formatNaira } from "@/lib/auth/roles";
import { StatCard } from "@/components/ui/card";
import { ListPanel } from "@/components/ui/page-header";
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
      const month = new Date().toISOString().slice(0, 7);
      if (result.csv && kind === "pack" && result.json) {
        downloadText(result.csv, `${result.filename}_tenants.csv`, "text/csv");
        downloadText(result.json, `${result.filename}.json`, "application/json");
        toast.success("Report pack downloaded (CSV + JSON).");
      } else if (result.csv) {
        downloadText(
          result.csv,
          kind === "payments" ? `payments_export_${month}.csv` : `units_export_${month}.csv`,
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
        <div className="flex flex-wrap gap-2 border-b border-border bg-white px-3 py-3">
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
            onClick={() => handleExport("payments", () => exportPaymentsCsv(orgSlug))}
          >
            Payments CSV
          </button>
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5"
            disabled={exporting !== null}
            onClick={() => handleExport("units", () => exportUnitsCsv(orgSlug))}
          >
            Units CSV
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
      )}

      <ListPanel>
        <h2 className="border-b border-border px-3 py-3 text-card-title">
          Tenant self-service activity
        </h2>
        <ResponsiveDataTable
          rows={activity.selfServiceRows}
          columns={columns}
          emptyMessage="No active leases yet."
        />
      </ListPanel>

      <div className="border-b border-border bg-white px-3 py-4">
        <h2 className="text-card-title">Monthly reports checklist</h2>
        <ul className="mt-3 space-y-2 text-list-secondary">
          <li>
            ✓ Units registered: <strong>{activity.unitsRegistered}</strong> — export Units CSV
          </li>
          <li>
            ✓ Tenants self-serving: <strong>{activity.tenantsSelfServing}</strong> — download
            report pack
          </li>
          <li>
            ✓ Verified ₦ this month:{" "}
            <strong>{formatNaira(activity.verifiedTotalNgnThisMonth)}</strong> — Payments CSV
          </li>
          <li>
            ✓ Collection rate: <strong>{activity.collectionRatePct}%</strong> — screenshot this page
          </li>
          <li className="flex items-center gap-2">
            <Camera className="h-4 w-4 shrink-0 text-muted" />
            Screenshot dashboard + tenant mobile pay flow
          </li>
        </ul>
        <p className="mt-4 text-list-meta">
          Store exports in your monthly reports folder (see{" "}
          <code className="text-xs">docs/02_monthly_reports_checklist.md</code>). Use{" "}
          <strong>Save snapshot</strong> to keep a dated record in the database.
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
                <span className="text-list-primary tabular-nums">{s.snapshot_date}</span>
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
