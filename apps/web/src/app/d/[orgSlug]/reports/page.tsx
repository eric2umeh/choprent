import { PageHeader } from "@/components/ui/page-header";
import { StatCard, Card } from "@/components/ui/card";
import { ReportsExportButtons } from "@/components/reports/reports-export-buttons";
import { requireStaffContext } from "@/lib/auth/session";
import { getDashboardStats } from "@/lib/data/dashboard-stats";
import { formatNaira } from "@/lib/auth/roles";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const stats = await getDashboardStats(ctx.org.id);
  const collectionRate =
    stats.expectedThisYear > 0
      ? Math.round((stats.collectedThisYear / stats.expectedThisYear) * 100)
      : 0;
  const canExport = ctx.role !== "agent";

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Collection metrics and OC3 export pack"
        action={canExport ? <ReportsExportButtons orgSlug={orgSlug} /> : undefined}
      />

      <div className="grid grid-cols-2 gap-2.5 border-b border-border bg-white px-3 py-3 xl:grid-cols-3">
        <StatCard
          label="Collection rate"
          value={`${collectionRate}%`}
          hint={`${stats.year} to date`}
        />
        <StatCard
          label="Verified total"
          value={formatNaira(stats.collectedThisYear)}
          hint="Payments confirmed"
        />
        <StatCard
          label="Arrears"
          value={formatNaira(stats.pastYearsArrears)}
          hint="Prior-year balances"
        />
      </div>

      <Card className="rounded-none border-x-0 border-t-0 shadow-none">
        <h2 className="text-section-title">Monthly metrics checklist</h2>
        <ul className="mt-3 space-y-2 text-list-secondary">
          <li>{canExport ? "↓ Download units CSV above" : "units_export.csv (landlord/manager)"}</li>
          <li>{canExport ? "↓ Download payments CSV above" : "payments_export.csv (landlord/manager)"}</li>
          <li>Collection rate chart screenshot</li>
          <li>Dashboard screenshot</li>
        </ul>
        <p className="mt-4 text-list-meta">
          Store exports in <code className="text-xs">works/choprent/metrics/YYYY-MM/</code> per{" "}
          <code className="text-xs">docs/02_metrics_tracking_checklist.md</code>.
        </p>
      </Card>
    </div>
  );
}
