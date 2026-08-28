"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  exportAppUsage,
  exportMetricsSummary,
  exportMonthlyReadme,
  exportPaymentsAudit,
  exportTeamSessions,
  exportTenantActivity,
  saveInsightsSnapshot,
} from "@/lib/actions/insights-exports";
import type { OrgInsights } from "@/lib/data/org-insights";
import { formatNaira } from "@/lib/auth/roles";
import { formatDisplayDate } from "@/lib/utils/format-date";
import { StatCard } from "@/components/ui/card";
import { ListPanel } from "@/components/ui/page-header";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Download, Camera, Save, BarChart2 } from "lucide-react";

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

export function InsightsPageClient({
  orgSlug,
  insights,
  snapshots,
}: {
  orgSlug: string;
  insights: OrgInsights;
  snapshots: SavedSnapshot[];
}) {
  const router = useRouter();
  const [exporting, setExporting] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const month = insights.exportedAt.slice(0, 7);

  const leaseSummary = useMemo(
    () => insights.leasesByStatus.map((r) => `${r.status}: ${r.count}`).join(" · "),
    [insights.leasesByStatus]
  );

  function handleExport(
    key: string,
    fn: () => Promise<{ error?: string; csv?: string; filename?: string }>,
    mime = "text/csv;charset=utf-8;"
  ) {
    setExporting(key);
    startTransition(async () => {
      const result = await fn();
      setExporting(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.csv && result.filename) {
        downloadText(result.csv, result.filename, mime);
        toast.success(`${result.filename} downloaded.`);
      }
    });
  }

  function handleSaveSnapshot() {
    startTransition(async () => {
      const result = await saveInsightsSnapshot(orgSlug);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Monthly snapshot saved.");
      router.refresh();
    });
  }

  const exports: {
    key: string;
    label: string;
    fn: () => Promise<{ error?: string; csv?: string; filename?: string }>;
    mime?: string;
  }[] = [
    { key: "summary", label: "Metrics summary", fn: () => exportMetricsSummary(orgSlug) },
    { key: "payments", label: "Payments audit", fn: () => exportPaymentsAudit(orgSlug) },
    { key: "staff", label: "Team sessions", fn: () => exportTeamSessions(orgSlug) },
    { key: "usage", label: "App usage", fn: () => exportAppUsage(orgSlug) },
    { key: "tenants", label: "Tenant activity", fn: () => exportTenantActivity(orgSlug) },
    {
      key: "readme",
      label: "Export readme",
      fn: () => exportMonthlyReadme(orgSlug),
      mime: "text/markdown;charset=utf-8;",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden border border-border bg-white animate-fade-in">
        <div className="flex flex-wrap items-start gap-3 px-3 py-4">
          <BarChart2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Workspace overview — {month}
            </p>
            <p className="text-xs text-list-secondary">
              Operational metrics for {insights.orgName}. Download exports for your monthly
              archive or board reporting.
            </p>
            <p className="text-[11px] text-muted">
              As of {formatDisplayDate(insights.exportedAt.slice(0, 10))} · {insights.orgSlug}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Units registered" value={String(insights.activity.unitsRegistered)} />
        <StatCard
          label="Collection rate"
          value={`${insights.activity.collectionRatePct}%`}
          hint={`${formatNaira(insights.activity.verifiedTotalNgnThisMonth)} verified this month`}
        />
        <StatCard
          label="Portal tenants"
          value={String(insights.portalTenants)}
          hint="Active leases with login"
        />
        <StatCard
          label="Team sign-ins (MTD)"
          value={String(insights.loginUsersThisMonth)}
          hint={`${insights.staffSessions.length} staff accounts`}
        />
        <StatCard
          label="App installs"
          value={String(insights.appInstalledUsers)}
          hint="Add to home screen"
        />
        <StatCard
          label="Standalone opens (MTD)"
          value={String(insights.standaloneUsersThisMonth)}
          hint="Opened from home screen"
        />
        <StatCard
          label="Verified payments (MTD)"
          value={String(insights.activity.verifiedPaymentsThisMonth)}
        />
        <StatCard
          label="Tenants self-serving"
          value={String(insights.activity.tenantsSelfServing)}
          hint="Receipt, ledger, or documents"
        />
      </div>

      {leaseSummary && (
        <p className="text-xs text-muted">Leases by status: {leaseSummary}</p>
      )}

      <ListPanel>
        <h2 className="border-b border-border px-3 py-3 text-card-title">Monthly exports</h2>
        <div className="px-3 py-4">
          <p className="mb-3 text-xs text-list-secondary">
            Download the full set each month, then save a snapshot to keep trend data in ChopRent.
          </p>
          <div className="flex flex-wrap gap-2">
            {exports.map(({ key, label, fn, mime }) => (
              <button
                key={key}
                type="button"
                disabled={!!exporting}
                onClick={() => handleExport(key, fn, mime)}
                className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-60"
              >
                {exporting === key ? (
                  <Spinner size="sm" className="text-white" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {label}
              </button>
            ))}
            <button
              type="button"
              disabled={!!exporting}
              onClick={handleSaveSnapshot}
              className="btn-ghost inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              Save snapshot
            </button>
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs"
              onClick={() => window.print()}
            >
              <Camera className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        </div>
      </ListPanel>

      <ListPanel>
        <h2 className="border-b border-border px-3 py-3 text-card-title">Team activity</h2>
        <div className="overflow-x-auto px-3 py-4">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 font-medium">Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {insights.staffSessions.map((row) => (
                <tr key={row.userId} className="border-b border-border/60">
                  <td className="py-2 pr-3">{row.displayName ?? "—"}</td>
                  <td className="py-2 pr-3">{row.email ?? "—"}</td>
                  <td className="py-2 pr-3 capitalize">{row.role}</td>
                  <td className="py-2">
                    {row.lastSignInAt ? (
                      formatDisplayDate(row.lastSignInAt.slice(0, 10))
                    ) : (
                      <Badge variant="muted">Never</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListPanel>

      {insights.usageByMonth.length > 0 && (
        <ListPanel>
          <h2 className="border-b border-border px-3 py-3 text-card-title">App usage by month</h2>
          <div className="overflow-x-auto px-3 py-4">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-3 font-medium">Signal</th>
                  <th className="py-2 pr-3 font-medium">Month</th>
                  <th className="py-2 pr-3 font-medium">Users</th>
                  <th className="py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {insights.usageByMonth.slice(0, 24).map((row) => (
                  <tr key={`${row.eventType}-${row.month}`} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-[11px]">{row.eventType}</td>
                    <td className="py-2 pr-3">{row.month}</td>
                    <td className="py-2 pr-3">{row.uniqueUsers}</td>
                    <td className="py-2">{row.totalEvents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListPanel>
      )}

      {snapshots.length > 0 && (
        <ListPanel>
          <h2 className="border-b border-border px-3 py-3 text-card-title">Saved snapshots</h2>
          <div className="overflow-x-auto px-3 py-4">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Units</th>
                  <th className="py-2 pr-3 font-medium">Self-serving</th>
                  <th className="py-2 pr-3 font-medium">Verified ₦</th>
                  <th className="py-2 font-medium">Collection %</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">{formatDisplayDate(s.snapshot_date)}</td>
                    <td className="py-2 pr-3">{s.units_registered}</td>
                    <td className="py-2 pr-3">{s.tenants_self_served}</td>
                    <td className="py-2 pr-3">{formatNaira(Number(s.verified_total_ngn))}</td>
                    <td className="py-2">{s.collection_rate_pct ?? "—"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListPanel>
      )}
    </div>
  );
}
