import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, Card } from "@/components/ui/card";
import {
  MOCK_ORG,
  MOCK_PAYMENTS,
  MOCK_STATS,
  MOCK_UNITS,
} from "@/lib/mock/data";
import { formatNaira } from "@/lib/auth/roles";
import { Badge } from "@/components/ui/badge";

export default async function DashboardHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { orgSlug } = await params;
  const { role = "owner" } = await searchParams;
  const q = role === "owner" ? "" : `?role=${role}`;
  const site = MOCK_ORG.sites[0];
  const pending = MOCK_PAYMENTS.filter((p) => p.status === "pending");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${site.name} · ${MOCK_ORG.name}`}
      />

      <div className="grid grid-cols-2 gap-2 border-b border-border bg-white px-3 py-3 xl:grid-cols-4">
        <StatCard
          label="Collected"
          value={formatNaira(MOCK_STATS.collected)}
          hint={`${MOCK_STATS.collectionRate}% of expected`}
        />
        <StatCard
          label="Outstanding"
          value={formatNaira(MOCK_STATS.arrears)}
          hint="All units"
        />
        <StatCard
          label="Occupancy"
          value={`${MOCK_STATS.occupiedUnits}/${MOCK_STATS.totalUnits}`}
          hint={`${MOCK_STATS.vacantUnits} vacant`}
        />
        <StatCard
          label="Pending verify"
          value={String(MOCK_STATS.pendingVerifications)}
          hint="Needs action"
        />
      </div>

      <div className="border-b border-border bg-white px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Pending verifications
          </h2>
          <Link
            href={`/d/${orgSlug}/payments${q}`}
            className="text-xs font-medium text-green-700 hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {pending.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border border-border bg-surface-subtle px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {p.unitCode} · {p.tenantName}
                </p>
                <p className="text-cell-muted">
                  {formatNaira(p.amount)} · {p.periodLabel}
                </p>
              </div>
              <Badge variant="warning">Pending</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Units</h2>
          <Link
            href={`/d/${orgSlug}/units${q}`}
            className="text-xs font-medium text-green-700 hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-border">
          {MOCK_UNITS.slice(0, 4).map((unit) => (
            <Link
              key={unit.id}
              href={`/d/${orgSlug}/units/${unit.id}${q}`}
              className="flex items-center justify-between py-2 hover:bg-green-50/40"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{unit.unitCode}</p>
                <p className="text-cell-muted capitalize">
                  {unit.propertyType}
                  {unit.tenantName ? ` · ${unit.tenantName}` : ""}
                </p>
              </div>
              {unit.arrears > 0 ? (
                <span className="text-xs font-semibold text-red-600">
                  {formatNaira(unit.arrears)}
                </span>
              ) : (
                <Badge variant="success">Current</Badge>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
