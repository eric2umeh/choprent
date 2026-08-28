import { createAdminClient } from "@/lib/supabase/admin";
import { buildCsv } from "@/lib/export/csv";
import { listPaymentsForOrg } from "@/lib/data/payments";
import { getTenantActivity, type TenantActivitySnapshot } from "@/lib/data/tenant-activity";
import type { MembershipRole } from "@/types/database";

export type StaffSessionRow = {
  userId: string;
  displayName: string | null;
  email: string | null;
  role: MembershipRole;
  lastSignInAt: string | null;
  createdAt: string | null;
};

export type UsageSummaryRow = {
  eventType: string;
  month: string;
  uniqueUsers: number;
  totalEvents: number;
};

export type LeaseStatusRow = {
  status: string;
  count: number;
};

export type OrgInsights = {
  exportedAt: string;
  orgName: string;
  orgSlug: string;
  activity: TenantActivitySnapshot;
  staffSessions: StaffSessionRow[];
  usageByMonth: UsageSummaryRow[];
  recentUsage: {
    id: string;
    eventType: string;
    userId: string | null;
    userAgent: string | null;
    createdAt: string;
  }[];
  leasesByStatus: LeaseStatusRow[];
  portalTenants: number;
  appInstalledUsers: number;
  standaloneUsersThisMonth: number;
  loginUsersThisMonth: number;
};

async function authUsersById(admin: ReturnType<typeof createAdminClient>) {
  const map = new Map<
    string,
    { email: string | null; lastSignInAt: string | null; createdAt: string | null }
  >();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data.users.length) break;
    for (const user of data.users) {
      map.set(user.id, {
        email: user.email ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        createdAt: user.created_at ?? null,
      });
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  return map;
}

export async function getStaffSessionRows(orgId: string): Promise<StaffSessionRow[]> {
  const admin = createAdminClient();
  const [{ data: memberships }, authMap] = await Promise.all([
    admin
      .from("memberships")
      .select("user_id, role, display_name")
      .eq("organization_id", orgId)
      .order("role"),
    authUsersById(admin),
  ]);

  return (memberships ?? []).map((row) => {
    const auth = authMap.get(row.user_id);
    return {
      userId: row.user_id,
      displayName: row.display_name,
      email: auth?.email ?? null,
      role: row.role as MembershipRole,
      lastSignInAt: auth?.lastSignInAt ?? null,
      createdAt: auth?.createdAt ?? null,
    };
  });
}

export async function getUsageSummaries(orgId: string): Promise<UsageSummaryRow[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("usage_events")
      .select("event_type, user_id, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) return [];

    const buckets = new Map<string, { users: Set<string>; total: number }>();

    for (const row of data ?? []) {
      const month = row.created_at.slice(0, 7);
      const key = `${row.event_type}|${month}`;
      const bucket = buckets.get(key) ?? { users: new Set<string>(), total: 0 };
      bucket.total += 1;
      if (row.user_id) bucket.users.add(row.user_id);
      buckets.set(key, bucket);
    }

    return [...buckets.entries()]
      .map(([key, bucket]) => {
        const [eventType, month] = key.split("|");
        return {
          eventType,
          month,
          uniqueUsers: bucket.users.size,
          totalEvents: bucket.total,
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month) || a.eventType.localeCompare(b.eventType));
  } catch {
    return [];
  }
}

export async function getOrgInsights(org: {
  id: string;
  name: string;
  slug: string;
}): Promise<OrgInsights> {
  const admin = createAdminClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();

  const [
    activity,
    staffSessions,
    usageByMonth,
    recentUsage,
    leasesByStatus,
    portalTenantsResult,
    appInstalledResult,
    standaloneResult,
    loginResult,
  ] = await Promise.all([
    getTenantActivity(org.id),
    getStaffSessionRows(org.id),
    getUsageSummaries(org.id),
    admin
      .from("usage_events")
      .select("id, event_type, user_id, user_agent, created_at")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("leases").select("status, units!inner(organization_id)").eq("units.organization_id", org.id),
    admin
      .from("leases")
      .select("id, units!inner(organization_id)")
      .eq("units.organization_id", org.id)
      .eq("status", "active")
      .not("tenant_user_id", "is", null),
    admin
      .from("usage_events")
      .select("user_id")
      .eq("organization_id", org.id)
      .eq("event_type", "pwa_installed")
      .not("user_id", "is", null),
    admin
      .from("usage_events")
      .select("user_id")
      .eq("organization_id", org.id)
      .eq("event_type", "standalone_session")
      .gte("created_at", monthStartIso)
      .not("user_id", "is", null),
    admin
      .from("usage_events")
      .select("user_id")
      .eq("organization_id", org.id)
      .eq("event_type", "login")
      .gte("created_at", monthStartIso)
      .not("user_id", "is", null),
  ]);

  const statusCounts = new Map<string, number>();
  for (const lease of leasesByStatus.data ?? []) {
    statusCounts.set(lease.status, (statusCounts.get(lease.status) ?? 0) + 1);
  }

  const unique = (rows: { user_id: string | null }[] | null) =>
    new Set((rows ?? []).map((r) => r.user_id).filter(Boolean)).size;

  return {
    exportedAt: new Date().toISOString(),
    orgName: org.name,
    orgSlug: org.slug,
    activity,
    staffSessions,
    usageByMonth,
    recentUsage: (recentUsage.data ?? []).map((row) => ({
      id: row.id,
      eventType: row.event_type,
      userId: row.user_id,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    })),
    leasesByStatus: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
    portalTenants: portalTenantsResult.data?.length ?? 0,
    appInstalledUsers: unique(appInstalledResult.data),
    standaloneUsersThisMonth: unique(standaloneResult.data),
    loginUsersThisMonth: unique(loginResult.data),
  };
}

export async function buildPaymentsAuditCsv(orgId: string): Promise<string> {
  const payments = await listPaymentsForOrg(orgId);
  return buildCsv(
    [
      "payment_id",
      "unit_code",
      "tenant_name",
      "amount_ngn",
      "period_label",
      "payment_method",
      "status",
      "payment_date",
      "bank_reference",
      "has_receipt",
      "verified_by",
      "verified_at",
      "created_at",
    ],
    payments.map((p) => [
      p.id,
      p.unitCode,
      p.tenantName,
      p.amount,
      p.periodLabel,
      p.paymentMethod,
      p.status,
      p.paymentDate,
      p.bankReference,
      p.receiptFileUrl ? "yes" : "no",
      p.verifiedByName,
      p.verifiedAt,
      p.createdAt,
    ])
  );
}

export function buildStaffSessionsCsv(rows: StaffSessionRow[]): string {
  return buildCsv(
    ["user_id", "display_name", "email", "role", "last_sign_in_at", "account_created_at"],
    rows.map((r) => [
      r.userId,
      r.displayName,
      r.email,
      r.role,
      r.lastSignInAt,
      r.createdAt,
    ])
  );
}

export function buildUsageCsv(rows: UsageSummaryRow[]): string {
  return buildCsv(
    ["event_type", "month", "unique_users", "total_events"],
    rows.map((r) => [r.eventType, r.month, r.uniqueUsers, r.totalEvents])
  );
}

export function buildMonthlyExportReadme(insights: OrgInsights): string {
  const month = insights.exportedAt.slice(0, 7);
  const lines = [
    "# ChopRent monthly export",
    "",
    `exported_at: ${insights.exportedAt}`,
    `source: ChopRent`,
    `organization: ${insights.orgName} (${insights.orgSlug})`,
    `report_month: ${month}`,
    "",
    "## Summary",
    `- units_registered: ${insights.activity.unitsRegistered}`,
    `- portal_tenants: ${insights.portalTenants}`,
    `- verified_payments_this_month: ${insights.activity.verifiedPaymentsThisMonth}`,
    `- verified_total_ngn_this_month: ${insights.activity.verifiedTotalNgnThisMonth}`,
    `- collection_rate_pct: ${insights.activity.collectionRatePct}`,
    `- staff_accounts: ${insights.staffSessions.length}`,
    `- staff_signed_in_this_month: ${insights.loginUsersThisMonth}`,
    `- app_installed_users: ${insights.appInstalledUsers}`,
    `- standalone_sessions_this_month: ${insights.standaloneUsersThisMonth}`,
    "",
    "## Files in this export",
    `- metrics_summary_${month}.csv`,
    `- payments_audit_${month}.csv`,
    `- team_sessions_${month}.csv`,
    `- app_usage_${month}.csv`,
    `- tenant_activity_${month}.csv`,
  ];
  return lines.join("\n");
}

export function buildMetricsSummaryCsv(insights: OrgInsights): string {
  const month = insights.exportedAt.slice(0, 7);
  return buildCsv(
    ["metric", "value", "month", "source"],
    [
      ["units_registered", insights.activity.unitsRegistered, month, "dashboard"],
      ["portal_tenants", insights.portalTenants, month, "leases"],
      ["verified_payments", insights.activity.verifiedPaymentsThisMonth, month, "payments"],
      ["verified_total_ngn", insights.activity.verifiedTotalNgnThisMonth, month, "payments"],
      ["collection_rate_pct", insights.activity.collectionRatePct, month, "dashboard"],
      ["staff_accounts", insights.staffSessions.length, month, "memberships"],
      ["staff_sign_ins_mtd", insights.loginUsersThisMonth, month, "usage_events"],
      ["app_installed_users", insights.appInstalledUsers, month, "usage_events"],
      ["standalone_sessions_mtd", insights.standaloneUsersThisMonth, month, "usage_events"],
      ["tenants_self_serving", insights.activity.tenantsSelfServing, month, "tenant_engagement"],
    ]
  );
}
