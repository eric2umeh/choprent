import { PageHeader } from "@/components/ui/page-header";
import { StatCard, Card } from "@/components/ui/card";
import { MOCK_STATS } from "@/lib/mock/data";
import { formatNaira } from "@/lib/auth/roles";
import { Download } from "lucide-react";

export default function ReportsPage() {
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
          value={`${MOCK_STATS.collectionRate}%`}
          hint="This month"
        />
        <StatCard
          label="Verified total"
          value={formatNaira(MOCK_STATS.collected)}
          hint="Payments confirmed"
        />
        <StatCard
          label="Arrears"
          value={formatNaira(MOCK_STATS.arrears)}
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
        <p className="mt-3 text-[11px] text-muted-foreground">
          Exports align with docs/02_metrics_tracking_checklist.md
        </p>
      </Card>
    </div>
  );
}
