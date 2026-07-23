import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListRow, SectionHeader } from "@/components/ui/section-header";
import { requireStaffContext } from "@/lib/auth/session";
import { getDashboardStats } from "@/lib/data/dashboard-stats";
import { getActivityFeed } from "@/lib/data/activity-feed";
import { DashboardLiveSync } from "@/components/dashboard/dashboard-live-sync";
import { listPaymentsForOrg } from "@/lib/data/payments";
import { listUnitsForOrg } from "@/lib/data/units";
import { unitPath } from "@/lib/routes/dashboard-paths";
import { formatPropertyType } from "@/lib/data/unit-types";
import { listNotificationsForUser } from "@/lib/data/notifications";
import { StaffNotificationsPanel } from "@/components/notifications/staff-notification-bell";
import { MarkDashboardNotificationsRead } from "@/components/notifications/mark-dashboard-notifications-read";
import { PilotSetupChecklist } from "@/components/onboarding/pilot-setup-checklist";
import { formatNaira } from "@/lib/auth/roles";
import { formatDisplayDate } from "@/lib/utils/format-date";
import { getPilotOnboardingStatus } from "@/lib/data/pilot-onboarding";

export default async function DashboardHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);

  const [stats, payments, units, activity, notifications, onboarding] =
    await Promise.all([
    getDashboardStats(ctx.org.id),
    listPaymentsForOrg(ctx.org.id),
    listUnitsForOrg(ctx.org.id),
    getActivityFeed(ctx.org.id, 8),
    listNotificationsForUser(ctx.user.id, ctx.org.id),
    ctx.role === "owner" || ctx.role === "admin"
      ? getPilotOnboardingStatus(ctx.org.id, orgSlug)
      : Promise.resolve(null),
  ]);

  const pending = payments.filter((p) => p.status === "pending");
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div>
      <DashboardLiveSync orgId={ctx.org.id} />
      <MarkDashboardNotificationsRead
        orgSlug={orgSlug}
        hasUnread={hasUnread}
      />
      <PageHeader title="Dashboard" description={ctx.org.name} />

      <StaffNotificationsPanel notifications={notifications} />

      {onboarding && <PilotSetupChecklist orgSlug={orgSlug} status={onboarding} />}

      <div className="grid grid-cols-2 gap-2.5 border-b border-border bg-white px-3 py-3 xl:grid-cols-4">
        <StatCard
          label="Collected"
          value={formatNaira(stats.collectedThisYear)}
          hint={`${formatNaira(stats.expectedThisYear)} expected in ${stats.year}`}
        />
        <StatCard
          label="Outstanding"
          value={formatNaira(stats.pastYearsArrears)}
          hint="Prior-year arrears on units"
        />
        <StatCard
          label="Occupied"
          value={`${stats.occupiedUnits}/${stats.totalUnits}`}
          hint={`${stats.vacantUnits} vacant`}
        />
        <StatCard
          label="Pending"
          value={String(stats.pendingVerifications)}
          hint="Needs action"
        />
      </div>

      <div className="border-b border-border bg-white px-3 py-4">
        <SectionHeader
          title="Pending verifications"
          href={`/d/${orgSlug}/payments`}
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

      <div className="border-b border-border bg-white px-3 py-4">
        <SectionHeader title="Recent activity" />
        <div className="space-y-2">
          {activity.length === 0 ? (
            <p className="text-empty-state list-row">No payment activity yet</p>
          ) : (
            activity.map((item) => (
              <ListRow key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-list-primary">{item.title}</p>
                  <p className="mt-0.5 text-list-secondary">{item.detail}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-money text-sm">{formatNaira(item.amount)}</p>
                  <p className="mt-0.5 text-list-meta tabular-nums">
                    {formatDisplayDate(item.at)}
                  </p>
                </div>
              </ListRow>
            ))
          )}
        </div>
      </div>

      <div className="bg-white px-3 py-4">
        <SectionHeader title="Units" href={`/d/${orgSlug}/properties`} />
        {units.length === 0 ? (
          <p className="text-empty-state">No unit yet — add a property, then add units.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {units.slice(0, 6).map((unit) => (
              <Link
                key={unit.id}
                href={
                  unit.propertySlug
                    ? unitPath(orgSlug, unit.propertySlug, unit.unitCode)
                    : `/d/${orgSlug}/properties`
                }
                className="interactive-lift rounded-xl border border-border bg-surface-subtle/40 p-3 transition hover:border-green-200 hover:bg-green-50/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm leading-snug">
                    <span className="text-list-primary">{unit.unitCode}</span>
                    <span className="text-list-meta"> · </span>
                    <span className="text-list-secondary capitalize">
                      {formatPropertyType(unit.propertyType)}
                    </span>
                    <span className="text-list-meta"> · </span>
                    <span className="text-list-secondary">
                      {unit.tenantName ?? "Vacant"}
                    </span>
                  </p>
                  {unit.arrears > 0 ? (
                    <span className="text-money-negative shrink-0 text-xs">
                      {formatNaira(unit.arrears)}
                    </span>
                  ) : (
                    <Badge variant="success" className="shrink-0">
                      Current
                    </Badge>
                  )}
                </div>
                {unit.propertyName && (
                  <p className="mt-1.5 truncate text-list-meta">{unit.propertyName}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
