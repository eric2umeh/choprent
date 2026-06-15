import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListRow, SectionHeader } from "@/components/ui/section-header";
import { requireStaffContext } from "@/lib/auth/session";
import { getDashboardStats } from "@/lib/data/dashboard-stats";
import { listPaymentsForOrg } from "@/lib/data/payments";
import { listUnitsForOrg } from "@/lib/data/units";
import { formatNaira } from "@/lib/auth/roles";
import type { MockRole } from "@/lib/mock/data";

export default async function DashboardHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { orgSlug } = await params;
  const { role: roleParam } = await searchParams;
  const ctx = await requireStaffContext(orgSlug, roleParam as MockRole | undefined);
  const q = ctx.demoMode && roleParam && roleParam !== "owner" ? `?role=${roleParam}` : "";

  const [stats, payments, units] = await Promise.all([
    getDashboardStats(ctx.org.id, ctx.demoMode),
    listPaymentsForOrg(ctx.org.id, ctx.demoMode),
    listUnitsForOrg(ctx.org.id, ctx.demoMode),
  ]);

  const pending = payments.filter((p) => p.status === "pending");

  return (
    <div>
      <PageHeader title="Dashboard" description={ctx.org.name} />

      <div className="grid grid-cols-2 gap-2.5 border-b border-border bg-white px-3 py-3 xl:grid-cols-4">
        <StatCard
          label="Collected"
          value={formatNaira(stats.collectedThisYear)}
          hint={
            stats.expectedThisYear > 0
              ? `${formatNaira(stats.expectedThisYear)} expected in ${stats.year}`
              : `No ${stats.year} charges posted yet`
          }
        />
        <StatCard
          label="Outstanding"
          value={formatNaira(stats.pastYearsArrears)}
          hint="Prior-year balances · all tenants"
        />
        <StatCard
          label="Occupancy"
          value={`${stats.occupiedUnits}/${stats.totalUnits}`}
          hint={`${stats.vacantUnits} vacant`}
        />
        <StatCard
          label="Pending verify"
          value={String(stats.pendingVerifications)}
          hint="Needs action"
        />
      </div>

      <div className="border-b border-border bg-white px-3 py-4">
        <SectionHeader
          title="Pending verifications"
          href={`/d/${orgSlug}/payments${q}`}
        />
        <div className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-empty-state list-row">No payments waiting for verification.</p>
          ) : (
            pending.slice(0, 5).map((p) => (
              <ListRow
                key={p.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-list-primary">{p.unitCode}</span>
                    <span className="text-list-secondary">{p.tenantName}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-money">{formatNaira(p.amount)}</span>
                    {p.periodLabel && (
                      <span className="text-meta-pill">{p.periodLabel}</span>
                    )}
                  </div>
                </div>
                <Badge variant="warning">Pending</Badge>
              </ListRow>
            ))
          )}
        </div>
      </div>

      <div className="bg-white px-3 py-4">
        <SectionHeader title="Units" href={`/d/${orgSlug}/units${q}`} />
        <div className="divide-y divide-border rounded-xl border border-border">
          {units.slice(0, 4).map((unit) => (
            <Link
              key={unit.id}
              href={`/d/${orgSlug}/units/${unit.id}${q}`}
              className="flex items-center justify-between gap-3 px-3 py-3 transition hover:bg-green-50/40"
            >
              <div className="min-w-0">
                <p className="text-list-primary">{unit.unitCode}</p>
                <p className="mt-0.5 text-list-secondary capitalize">
                  {unit.propertyType}
                  {unit.tenantName ? ` · ${unit.tenantName}` : ""}
                </p>
              </div>
              {unit.arrears > 0 ? (
                <span className="text-money-negative shrink-0">
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
