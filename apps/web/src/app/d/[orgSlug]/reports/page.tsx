import { PageHeader } from "@/components/ui/page-header";
import { StatCard, Card } from "@/components/ui/card";
import { requireStaffContext } from "@/lib/auth/session";
import { getDashboardStats } from "@/lib/data/dashboard-stats";
import { formatNaira } from "@/lib/auth/roles";
import { Download } from "lucide-react";

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

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Collection metrics and OC3 export pack"
        action={
          <button
            type="button"
            className="btn-primary inline-flex gap-1.5 px-3 py-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export month pack
          </button>
        }
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
          <li>✓ units_export.csv</li>
          <li>✓ payments_export.csv</li>
          <li>✓ Collection rate chart screenshot</li>
          <li>✓ Dashboard screenshot</li>
        </ul>
      </Card>
    </div>
  );
}
