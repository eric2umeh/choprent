import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { requireStaffContext } from "@/lib/auth/session";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireStaffContext(orgSlug);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Data-driven insights to improve property profitability"
      />

      <div className="space-y-3 px-3 pt-4">
        <Card className="rounded-xl border-green-200 bg-green-50/50 p-4">
          <p className="text-sm font-semibold text-green-950">Rent increase advisor</p>
          <p className="mt-2 text-sm text-green-900/90">
            Planned feature: suggest rent adjustments using collection history,
            arrears trends, local plaza benchmarks, FX (USD/NGN), and your
            expense vs revenue ratio — with clear reasoning before you renew a lease.
          </p>
        </Card>

        <Card className="rounded-xl border-border bg-white p-4">
          <p className="text-sm font-semibold text-foreground">Also planned</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted">
            <li>Occupancy and collection rate trends by property</li>
            <li>Arrears heat map by unit type (shop vs flat vs office)</li>
            <li>Nearby market rent signals (state / LGA benchmarks)</li>
            <li>Profit margin after expenses (ties to Expenses module)</li>
          </ul>
        </Card>

        <p className="text-sm text-muted">
          ChopRent is already collecting the ledger, payment, and unit data this
          module will use.{" "}
          <Link
            href={`/d/${orgSlug}/reports`}
            className="font-semibold text-green-800 hover:text-green-900"
          >
            See Reports
          </Link>{" "}
          for today&apos;s collection summary.
        </p>
      </div>
    </div>
  );
}
