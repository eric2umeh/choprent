"use client";

import Link from "next/link";
import { formatNaira } from "@/lib/auth/roles";
import { formatPropertyType } from "@/lib/data/unit-types";
import type { PortfolioMetrics, RentAdvisorItem } from "@/lib/data/analytics";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function advisorVariant(item: RentAdvisorItem) {
  if (item.recommendation === "increase") return "success" as const;
  if (item.recommendation === "reduce") return "warning" as const;
  return "muted" as const;
}

export function AnalyticsPageClient({
  orgSlug,
  metrics,
  advisor,
}: {
  orgSlug: string;
  metrics: PortfolioMetrics;
  advisor: RentAdvisorItem[];
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 border-b border-border bg-white px-3 py-3 xl:grid-cols-4">
        <StatCard
          label="Collection rate"
          value={`${metrics.collectionRate}%`}
          hint={`${metrics.year} ledger`}
        />
        <StatCard
          label="Occupancy"
          value={`${metrics.occupancyRate}%`}
          hint={`${metrics.occupiedUnits}/${metrics.totalUnits} units`}
        />
        <StatCard
          label="Net margin"
          value={`${metrics.netMarginPct}%`}
          hint="After recorded expenses"
        />
        <StatCard
          label="Arrears"
          value={formatNaira(metrics.totalArrears)}
          hint="Across portfolio"
        />
      </div>

      <div className="border-b border-border bg-white px-3 py-4">
        <h2 className="text-card-title">Rent increase advisor</h2>
        <p className="mt-1 text-list-secondary">
          Rule-based suggestions for leases renewing in the next 120 days — based on
          collection history and arrears.
        </p>
        <div className="mt-3 space-y-2">
          {advisor.length === 0 ? (
            <p className="text-empty-state rounded-xl border border-dashed border-border px-3 py-6 text-center">
              No renewals coming up — or add leases with end dates to see suggestions.
            </p>
          ) : (
            advisor.map((item) => (
              <div
                key={item.unitId}
                className="rounded-xl border border-border px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-list-primary">
                      {item.unitCode} · {item.tenantName}
                    </p>
                    <p className="mt-0.5 text-list-secondary">{item.propertyName}</p>
                  </div>
                  <Badge variant={advisorVariant(item)}>
                    {item.recommendation === "increase"
                      ? `+${item.suggestedPct}% suggested`
                      : "Hold rent"}
                  </Badge>
                </div>
                <p className="mt-2 text-form-hint">{item.reasoning}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-list-meta">
                  <span>{item.collectionRate}% collected</span>
                  <span>{formatNaira(item.arrears)} arrears</span>
                  <span>Ends {item.leaseEndDate}</span>
                  <span>{item.daysToRenewal}d to renewal</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {metrics.arrearsByType.length > 0 && (
        <div className="border-b border-border bg-white px-3 py-4">
          <h2 className="text-card-title">Arrears by unit type</h2>
          <div className="mt-3 space-y-2">
            {metrics.arrearsByType.map((row) => (
              <div
                key={row.type}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <span className="text-list-primary capitalize">
                  {formatPropertyType(row.type)}
                </span>
                <div className="text-right text-sm">
                  <p className="text-money-negative">{formatNaira(row.arrears)}</p>
                  <p className="text-list-meta">{row.unitCount} units</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white px-3 py-4">
        <p className="text-list-secondary">
          Record costs on{" "}
          <Link
            href={`/d/${orgSlug}/expenses`}
            className="font-semibold text-green-800 hover:text-green-900"
          >
            Expenses
          </Link>{" "}
          to improve net margin accuracy. Export metrics from{" "}
          <Link
            href={`/d/${orgSlug}/reports`}
            className="font-semibold text-green-800 hover:text-green-900"
          >
            Reports
          </Link>
          .
        </p>
      </div>
    </>
  );
}
