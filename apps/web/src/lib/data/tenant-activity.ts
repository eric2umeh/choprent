import { createAdminClient } from "@/lib/supabase/admin";
import { getDashboardStats } from "@/lib/data/dashboard-stats";

export type TenantEngagementEventType =
  | "receipt_uploaded"
  | "ledger_viewed"
  | "document_downloaded"
  | "statement_downloaded"
  | "dva_payment_received";

export type TenantSelfServiceRow = {
  id: string;
  tenantUserId: string | null;
  tenantName: string;
  unitCode: string;
  uploadedReceipt: boolean;
  viewedLedger: boolean;
  downloadedDocument: boolean;
  dvaPayment: boolean;
  qualifiesSelfServing: boolean;
  lastActivityAt: string | null;
};

export type TenantActivitySnapshot = {
  asOf: string;
  year: number;
  unitsRegistered: number;
  tenantsWithProfiles: number;
  tenantsSelfServing: number;
  tenantsWithLedgerView: number;
  tenantsWithDocumentDownload: number;
  verifiedPaymentsThisMonth: number;
  verifiedTotalNgnThisMonth: number;
  verifiedPaymentsYtd: number;
  verifiedTotalNgnYtd: number;
  collectionRatePct: number;
  arrearsNgn: number;
  occupiedUnits: number;
  totalUnits: number;
  selfServiceRows: TenantSelfServiceRow[];
};

function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function getTenantActivity(orgId: string): Promise<TenantActivitySnapshot> {
  const admin = createAdminClient();
  const stats = await getDashboardStats(orgId);
  const { start: monthStart, end: monthEnd } = monthBounds();
  const yearStart = `${stats.year}-01-01`;
  const yearEnd = `${stats.year + 1}-01-01`;

  try {
  const [
    { data: leases },
    { data: events },
    { data: monthPayments },
    { data: ytdPayments },
    { data: tenantPayments },
  ] = await Promise.all([
    admin
      .from("leases")
      .select("id, tenant_user_id, tenant_display_name, unit_id, status, units!inner(unit_code, organization_id)")
      .eq("units.organization_id", orgId)
      .eq("status", "active"),
    admin
      .from("tenant_engagement_events")
      .select("tenant_user_id, event_type, created_at, lease_id, unit_id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    admin
      .from("payments")
      .select("amount_ngn")
      .eq("organization_id", orgId)
      .in("status", ["verified", "auto_matched"])
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd),
    admin
      .from("payments")
      .select("amount_ngn")
      .eq("organization_id", orgId)
      .in("status", ["verified", "auto_matched"])
      .gte("created_at", yearStart)
      .lt("created_at", yearEnd),
    admin
      .from("payments")
      .select("tenant_id, payment_method, receipt_file_url, created_at")
      .eq("organization_id", orgId)
      .not("tenant_id", "is", null),
  ]);

  const eventsByTenant = new Map<string, Set<TenantEngagementEventType>>();
  const lastEventByTenant = new Map<string, string>();

  for (const event of events ?? []) {
    if (!event.tenant_user_id) continue;
    const set = eventsByTenant.get(event.tenant_user_id) ?? new Set();
    set.add(event.event_type as TenantEngagementEventType);
    eventsByTenant.set(event.tenant_user_id, set);
    if (!lastEventByTenant.has(event.tenant_user_id)) {
      lastEventByTenant.set(event.tenant_user_id, event.created_at);
    }
  }

  const receiptByTenant = new Map<string, boolean>();
  const dvaByTenant = new Map<string, boolean>();
  for (const payment of tenantPayments ?? []) {
    if (!payment.tenant_id) continue;
    if (payment.receipt_file_url) receiptByTenant.set(payment.tenant_id, true);
    if (payment.payment_method === "dedicated_account") {
      dvaByTenant.set(payment.tenant_id, true);
    }
  }

  const selfServiceRows: TenantSelfServiceRow[] = (leases ?? []).map((lease) => {
    const units = lease.units as { unit_code: string } | { unit_code: string }[];
    const unitCode = Array.isArray(units) ? units[0]?.unit_code : units.unit_code;
    const tenantUserId = lease.tenant_user_id;
    const eventSet = tenantUserId ? eventsByTenant.get(tenantUserId) : undefined;

    const uploadedReceipt =
      (tenantUserId && receiptByTenant.get(tenantUserId)) ||
      eventSet?.has("receipt_uploaded") ||
      false;
    const viewedLedger = eventSet?.has("ledger_viewed") ?? false;
    const downloadedDocument =
      eventSet?.has("document_downloaded") ||
      eventSet?.has("statement_downloaded") ||
      false;
    const dvaPayment =
      (tenantUserId && dvaByTenant.get(tenantUserId)) ||
      eventSet?.has("dva_payment_received") ||
      false;

    const qualifiesSelfServing =
      uploadedReceipt || dvaPayment || viewedLedger || downloadedDocument;

    return {
      id: lease.id,
      tenantUserId,
      tenantName: lease.tenant_display_name,
      unitCode: unitCode ?? "—",
      uploadedReceipt,
      viewedLedger,
      downloadedDocument,
      dvaPayment,
      qualifiesSelfServing,
      lastActivityAt: tenantUserId ? lastEventByTenant.get(tenantUserId) ?? null : null,
    };
  });

  const tenantsWithProfiles = selfServiceRows.filter((r) => r.tenantUserId).length;
  const tenantsSelfServing = selfServiceRows.filter((r) => r.qualifiesSelfServing).length;
  const tenantsWithLedgerView = selfServiceRows.filter((r) => r.viewedLedger).length;
  const tenantsWithDocumentDownload = selfServiceRows.filter((r) => r.downloadedDocument).length;

  const verifiedTotalNgnThisMonth = (monthPayments ?? []).reduce(
    (sum, p) => sum + Number(p.amount_ngn),
    0
  );
  const verifiedTotalNgnYtd = (ytdPayments ?? []).reduce(
    (sum, p) => sum + Number(p.amount_ngn),
    0
  );

  const collectionRatePct =
    stats.expectedThisYear > 0
      ? Math.round((stats.collectedThisYear / stats.expectedThisYear) * 100)
      : 0;

  return {
    asOf: new Date().toISOString(),
    year: stats.year,
    unitsRegistered: stats.totalUnits,
    tenantsWithProfiles,
    tenantsSelfServing,
    tenantsWithLedgerView,
    tenantsWithDocumentDownload,
    verifiedPaymentsThisMonth: monthPayments?.length ?? 0,
    verifiedTotalNgnThisMonth,
    verifiedPaymentsYtd: ytdPayments?.length ?? 0,
    verifiedTotalNgnYtd,
    collectionRatePct,
    arrearsNgn: stats.pastYearsArrears,
    occupiedUnits: stats.occupiedUnits,
    totalUnits: stats.totalUnits,
    selfServiceRows,
  };
  } catch {
    return {
      asOf: new Date().toISOString(),
      year: stats.year,
      unitsRegistered: stats.totalUnits,
      tenantsWithProfiles: 0,
      tenantsSelfServing: 0,
      tenantsWithLedgerView: 0,
      tenantsWithDocumentDownload: 0,
      verifiedPaymentsThisMonth: 0,
      verifiedTotalNgnThisMonth: 0,
      verifiedPaymentsYtd: 0,
      verifiedTotalNgnYtd: 0,
      collectionRatePct:
        stats.expectedThisYear > 0
          ? Math.round((stats.collectedThisYear / stats.expectedThisYear) * 100)
          : 0,
      arrearsNgn: stats.pastYearsArrears,
      occupiedUnits: stats.occupiedUnits,
      totalUnits: stats.totalUnits,
      selfServiceRows: [],
    };
  }
}

export async function listReportSnapshots(orgId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("metrics_snapshots")
    .select(
      "id, snapshot_date, units_registered, tenants_with_profiles, tenants_self_served, verified_payments_count, verified_total_ngn, collection_rate_pct, arrears_ngn, created_at"
    )
    .eq("organization_id", orgId)
    .order("snapshot_date", { ascending: false })
    .limit(12);

  return data ?? [];
}

export function tenantActivityToJson(activity: TenantActivitySnapshot): string {
  return JSON.stringify(activity, null, 2);
}

export async function buildTenantActivityCsv(activity: TenantActivitySnapshot): Promise<string> {
  const { buildCsv } = await import("@/lib/export/csv");
  return buildCsv(
    [
      "tenant_name",
      "unit_code",
      "has_login",
      "uploaded_receipt",
      "viewed_ledger",
      "downloaded_document",
      "dva_payment",
      "qualifies_self_serving",
      "last_activity_at",
    ],
    activity.selfServiceRows.map((row) => [
      row.tenantName,
      row.unitCode,
      row.tenantUserId ? "yes" : "no",
      row.uploadedReceipt ? "yes" : "no",
      row.viewedLedger ? "yes" : "no",
      row.downloadedDocument ? "yes" : "no",
      row.dvaPayment ? "yes" : "no",
      row.qualifiesSelfServing ? "yes" : "no",
      row.lastActivityAt,
    ])
  );
}
