import { sortByNaturalKey } from "@/lib/utils/natural-sort";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BillingCadence } from "@/types/database";
import { slugify } from "@/lib/utils/slug";
import {
  deriveTenantPaymentStatus,
  type TenantPaymentStatus,
} from "@/lib/data/tenant-payment-status";
import { actorLabel, resolveActorLabels } from "@/lib/data/audit-actors";
import { listBillingPeriods } from "@/lib/charges/period-ranges";
import {
  computeUnitOutstanding,
  sumUnallocatedCredits,
} from "@/lib/data/unit-outstanding";

export type LeaseListItem = {
  id: string;
  unitId: string;
  unitCode: string;
  propertyId: string;
  propertySlug: string;
  propertyName: string;
  tenantName: string;
  tenantPhone: string | null;
  tenantEmail: string | null;
  tenantUserId: string | null;
  startDate: string;
  endDate: string;
  billingCadence: BillingCadence;
  autoRenew: boolean;
  status: "draft" | "active" | "ended" | "renewed";
  annualTotal: number;
  paidAmount: number;
  arrears: number;
  /** Unpaid unit-linked expenses (AEPB, etc.) after payment credits. */
  expenseOutstanding: number;
  paymentStatus: TenantPaymentStatus;
  settlementAccountId: string | null;
};

export type LeaseDetail = LeaseListItem & {
  createdAt: string | null;
  createdByName: string | null;
  payments: {
    id: string;
    amount: number;
    status: string;
    method: string;
    date: string;
    periodLabel: string | null;
    submittedByName: string | null;
  }[];
  priorLeases: {
    id: string;
    tenantName: string;
    startDate: string;
    endDate: string;
    status: string;
  }[];
};

type LeaseRow = {
  id: string;
  unit_id: string;
  tenant_display_name: string;
  tenant_phone: string | null;
  tenant_email: string | null;
  tenant_user_id: string | null;
  start_date: string;
  end_date: string;
  billing_cadence: BillingCadence;
  auto_renew?: boolean | null;
  settlement_account_id?: string | null;
  status: LeaseListItem["status"];
  created_at?: string;
  created_by?: string | null;
  units:
    | {
        unit_code: string;
        site_id: string;
        organization_id: string;
        arrears_balance_ngn: number;
        sites: { name: string; slug?: string } | { name: string; slug?: string }[] | null;
      }
    | {
        unit_code: string;
        site_id: string;
        organization_id: string;
        arrears_balance_ngn: number;
        sites: { name: string; slug?: string } | { name: string; slug?: string }[] | null;
      }[]
    | null;
};

function unitFromRow(units: LeaseRow["units"]) {
  if (!units) return null;
  return Array.isArray(units) ? units[0] : units;
}

function unitCodeFromRow(units: LeaseRow["units"]): string {
  return unitFromRow(units)?.unit_code ?? "—";
}

function propertySlugFromRow(units: LeaseRow["units"]): string {
  const unit = unitFromRow(units);
  if (!unit) return "";
  const site = unit.sites;
  const siteRow = Array.isArray(site) ? site[0] : site;
  if (siteRow?.slug) return siteRow.slug;
  if (siteRow?.name) return slugify(siteRow.name);
  return unit.site_id;
}

function propertyNameFromRow(units: LeaseRow["units"]): string {
  const unit = unitFromRow(units);
  if (!unit) return "Property";
  const site = unit.sites;
  if (Array.isArray(site)) return site[0]?.name ?? "Property";
  return site?.name ?? "Property";
}

async function getLeaseFinancials(
  admin: ReturnType<typeof createAdminClient>,
  leaseId: string,
  unitId: string,
  arrearsBalance: number,
  orgId: string,
  leaseMeta?: {
    startDate: string;
    endDate: string;
    billingCadence: BillingCadence;
  }
): Promise<{
  expected: number;
  paid: number;
  arrears: number;
  expenseOutstanding: number;
}> {
  const arrears = Number(arrearsBalance ?? 0);

  let startDate = leaseMeta?.startDate;
  let endDate = leaseMeta?.endDate;
  let cadence = leaseMeta?.billingCadence;

  if (!startDate || !endDate || !cadence) {
    const { data: lease } = await admin
      .from("leases")
      .select("start_date, end_date, billing_cadence")
      .eq("id", leaseId)
      .maybeSingle();
    startDate = lease?.start_date;
    endDate = lease?.end_date;
    cadence = lease?.billing_cadence;
  }

  const expectedStarts = new Set(
    startDate && endDate && cadence
      ? listBillingPeriods(startDate, endDate, cadence).map((p) => p.periodStart)
      : []
  );

  // Only anniversary (or schedule-matching) open periods — never sum calendar leftovers.
  const { data: periods } = await admin
    .from("ledger_periods")
    .select(
      "expected_total_ngn, paid_total_ngn, arrears_opening_ngn, status, lease_id, period_start, period_end"
    )
    .eq("unit_id", unitId)
    .eq("status", "open")
    .order("period_start", { ascending: false });

  let expected = 0;
  let paid = 0;
  let relevantPeriods: Array<{
    expected_total_ngn: number;
    paid_total_ngn: number;
    arrears_opening_ngn: number;
  }> = [];

  if (periods?.length) {
    const forLease = periods.filter((p) => p.lease_id === leaseId);
    const pool = forLease.length > 0 ? forLease : periods;
    const relevant =
      expectedStarts.size > 0
        ? pool.filter((p) => expectedStarts.has(p.period_start))
        : pool;
    expected = relevant.reduce(
      (sum, p) => sum + Number(p.expected_total_ngn),
      0
    );
    paid = relevant.reduce((sum, p) => sum + Number(p.paid_total_ngn), 0);
    relevantPeriods = relevant.map((p) => ({
      expected_total_ngn: Number(p.expected_total_ngn),
      paid_total_ngn: Number(p.paid_total_ngn),
      arrears_opening_ngn: Number(p.arrears_opening_ngn ?? 0),
    }));
  }

  if (expected <= 0) {
    const { data: template } = await admin
      .from("charge_templates")
      .select("amount")
      .eq("scope", "unit")
      .eq("scope_id", unitId)
      .eq("charge_kind", "rent")
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    expected = Number(template?.amount ?? 0);
    // Keep relevantPeriods for expense credit netting; display paid stays 0
    // when there is no open schedule amount.
    if (!relevantPeriods.length) paid = 0;
  }

  const [{ data: expenses }, { data: payments }] = await Promise.all([
    admin
      .from("property_expenses")
      .select("amount_ngn")
      .eq("unit_id", unitId)
      .eq("organization_id", orgId),
    admin
      .from("payments")
      .select("status, metadata")
      .eq("unit_id", unitId)
      .in("status", ["verified", "auto_matched"]),
  ]);

  const { expenseOutstanding } = computeUnitOutstanding({
    arrearsBalance: 0,
    periods: relevantPeriods,
    expenseAmounts: (expenses ?? []).map((e) => Number(e.amount_ngn)),
    unallocatedCredits: sumUnallocatedCredits(payments ?? []),
  });

  return { expected, paid, arrears, expenseOutstanding };
}

async function mapLeaseRows(
  rows: LeaseRow[],
  admin: ReturnType<typeof createAdminClient>
): Promise<LeaseListItem[]> {
  return Promise.all(
    rows.map(async (row) => {
      const unit = unitFromRow(row.units);
      const orgId = unit?.organization_id ?? "";
      const { expected, paid, arrears, expenseOutstanding } =
        await getLeaseFinancials(
          admin,
          row.id,
          row.unit_id,
          unit?.arrears_balance_ngn ?? 0,
          orgId,
          {
            startDate: row.start_date,
            endDate: row.end_date,
            billingCadence: row.billing_cadence,
          }
        );

      return {
        id: row.id,
        unitId: row.unit_id,
        unitCode: unitCodeFromRow(row.units),
        propertyId: unit?.site_id ?? "",
        propertySlug: propertySlugFromRow(row.units) || unit?.site_id || "",
        propertyName: propertyNameFromRow(row.units),
        tenantName: row.tenant_display_name,
        tenantPhone: row.tenant_phone,
        tenantEmail: row.tenant_email,
        tenantUserId: row.tenant_user_id,
        startDate: row.start_date,
        endDate: row.end_date,
        billingCadence: row.billing_cadence,
        autoRenew: row.auto_renew !== false,
        status: row.status,
        annualTotal: expected,
        paidAmount: paid,
        arrears,
        expenseOutstanding,
        paymentStatus: deriveTenantPaymentStatus(
          expected,
          paid,
          arrears + expenseOutstanding
        ),
        settlementAccountId: row.settlement_account_id ?? null,
      };
    })
  );
}

const leaseSelect =
  "id, unit_id, tenant_display_name, tenant_phone, tenant_email, tenant_user_id, start_date, end_date, billing_cadence, auto_renew, settlement_account_id, status, created_at, created_by, units!inner(unit_code, site_id, organization_id, arrears_balance_ngn, sites(name, slug))";

const leaseSelectFallback =
  "id, unit_id, tenant_display_name, tenant_phone, tenant_email, tenant_user_id, start_date, end_date, billing_cadence, settlement_account_id, status, created_at, created_by, units!inner(unit_code, site_id, organization_id, arrears_balance_ngn, sites(name, slug))";

export async function listLeasesForOrg(
  orgId: string,
  options?: { status?: "active" | "former" }
): Promise<LeaseListItem[]> {
  try {
    const admin = createAdminClient();

    async function fetchRows(select: string) {
      let query = admin
        .from("leases")
        .select(select)
        .eq("units.organization_id", orgId)
        .order("start_date", { ascending: false });

      if (options?.status === "former") {
        query = query.in("status", ["ended", "renewed"]);
      } else {
        query = query.eq("status", "active");
      }
      return query;
    }

    let { data, error } = await fetchRows(leaseSelect);
    if (error) {
      ({ data, error } = await fetchRows(leaseSelectFallback));
    }
    if (error || !data) return [];

    let rows = data as unknown as LeaseRow[];

    if (options?.status !== "former") {
      const { ensureAutoRenewedLease } = await import("@/lib/leases/auto-renew");
      const { repairStaleLedgerPeriodsForUnit } = await import(
        "@/lib/charges/generate-ledger"
      );
      rows = await Promise.all(
        rows.map(async (row) => {
          const renewed = await ensureAutoRenewedLease(admin, orgId, {
            id: row.id,
            unit_id: row.unit_id,
            start_date: row.start_date,
            end_date: row.end_date,
            status: row.status,
            auto_renew: row.auto_renew,
          });
          return { ...row, end_date: renewed.end_date };
        })
      );
      const unitIds = [...new Set(rows.map((r) => r.unit_id))];
      await Promise.all(
        unitIds.map((unitId) =>
          repairStaleLedgerPeriodsForUnit(admin, orgId, unitId)
        )
      );
    }

    const leases = await mapLeaseRows(rows, admin);
    return sortByNaturalKey(leases, (lease) => lease.unitCode);
  } catch {
    return [];
  }
}

export async function getLeaseDetail(
  orgId: string,
  leaseId: string
): Promise<LeaseDetail | null> {
  try {
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("leases")
      .select(leaseSelect)
      .eq("id", leaseId)
      .eq("units.organization_id", orgId)
      .maybeSingle();

    if (!row) return null;

    const leaseRow = row as LeaseRow;
    const unitId = leaseRow.unit_id;

    if (leaseRow.status === "active") {
      const { ensureAutoRenewedLease } = await import("@/lib/leases/auto-renew");
      const renewed = await ensureAutoRenewedLease(admin, orgId, {
        id: leaseRow.id,
        unit_id: leaseRow.unit_id,
        start_date: leaseRow.start_date,
        end_date: leaseRow.end_date,
        status: leaseRow.status,
        auto_renew: leaseRow.auto_renew,
      });
      leaseRow.end_date = renewed.end_date;
    }

    const { repairStaleLedgerPeriodsForUnit } = await import(
      "@/lib/charges/generate-ledger"
    );
    await repairStaleLedgerPeriodsForUnit(admin, orgId, unitId);

    const mapped = (await mapLeaseRows([leaseRow], admin))[0];

    const actorLabels = await resolveActorLabels(orgId, [row.created_by]);

    const [{ data: payments }, { data: priorLeases }] = await Promise.all([
      admin
        .from("payments")
        .select(
          "id, amount_ngn, status, payment_method, created_at, period_label, recorded_by, tenant_id"
        )
        .eq("unit_id", mapped.unitId)
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("leases")
        .select("id, tenant_display_name, start_date, end_date, status")
        .eq("unit_id", mapped.unitId)
        .neq("id", leaseId)
        .order("start_date", { ascending: false })
        .limit(10),
    ]);

    const paymentActors = await resolveActorLabels(
      orgId,
      (payments ?? []).map((p) => p.recorded_by ?? p.tenant_id)
    );

    return {
      ...mapped,
      createdAt: row.created_at?.slice(0, 10) ?? null,
      createdByName: actorLabel(actorLabels, row.created_by),
      payments: (payments ?? []).map((p) => ({
        id: p.id,
        amount: Number(p.amount_ngn),
        status: p.status,
        method: p.payment_method,
        date: p.created_at.slice(0, 10),
        periodLabel: p.period_label,
        submittedByName: actorLabel(
          paymentActors,
          p.recorded_by ?? p.tenant_id
        ),
      })),
      priorLeases: (priorLeases ?? []).map((l) => ({
        id: l.id,
        tenantName: l.tenant_display_name,
        startDate: l.start_date,
        endDate: l.end_date,
        status: l.status,
      })),
    };
  } catch {
    return null;
  }
}

export async function listVacantUnitsForLease(
  orgId: string
): Promise<
  {
    id: string;
    unitCode: string;
    siteId: string;
    settlementAccountId: string | null;
  }[]
> {
  try {
    const admin = createAdminClient();
    const [{ data: units }, { data: activeLeases }] = await Promise.all([
      admin
        .from("units")
        .select("id, unit_code, site_id, settlement_account_id")
        .eq("organization_id", orgId)
        .order("unit_code"),
      admin
        .from("leases")
        .select("unit_id, units!inner(organization_id)")
        .eq("status", "active")
        .eq("units.organization_id", orgId),
    ]);

    const leasedIds = new Set((activeLeases ?? []).map((l) => l.unit_id));
    return (units ?? [])
      .filter((u) => !leasedIds.has(u.id))
      .map((u) => ({
        id: u.id,
        unitCode: u.unit_code,
        siteId: u.site_id,
        settlementAccountId: u.settlement_account_id ?? null,
      }));
  } catch {
    return [];
  }
}

export async function getTenantStatusByUnit(
  orgId: string
): Promise<Map<string, { status: TenantPaymentStatus; leaseId: string }>> {
  const leases = await listLeasesForOrg(orgId);
  const map = new Map<string, { status: TenantPaymentStatus; leaseId: string }>();
  for (const lease of leases) {
    if (lease.status === "active") {
      map.set(lease.unitId, { status: lease.paymentStatus, leaseId: lease.id });
    }
  }
  return map;
}

export async function getUnitHistory(
  orgId: string,
  unitId: string
): Promise<{
  payments: LeaseDetail["payments"];
  leases: LeaseDetail["priorLeases"];
}> {
  try {
    const admin = createAdminClient();
    const [{ data: payments }, { data: leases }] = await Promise.all([
      admin
        .from("payments")
        .select(
          "id, amount_ngn, status, payment_method, created_at, period_label, recorded_by, tenant_id"
        )
        .eq("organization_id", orgId)
        .eq("unit_id", unitId)
        .order("created_at", { ascending: false })
        .limit(30),
      admin
        .from("leases")
        .select("id, tenant_display_name, start_date, end_date, status")
        .eq("unit_id", unitId)
        .order("start_date", { ascending: false })
        .limit(20),
    ]);

    const paymentActors = await resolveActorLabels(
      orgId,
      (payments ?? []).map((p) => p.recorded_by ?? p.tenant_id)
    );

    return {
      payments: (payments ?? []).map((p) => ({
        id: p.id,
        amount: Number(p.amount_ngn),
        status: p.status,
        method: p.payment_method,
        date: p.created_at.slice(0, 10),
        periodLabel: p.period_label,
        submittedByName: actorLabel(
          paymentActors,
          p.recorded_by ?? p.tenant_id
        ),
      })),
      leases: (leases ?? []).map((l) => ({
        id: l.id,
        tenantName: l.tenant_display_name,
        startDate: l.start_date,
        endDate: l.end_date,
        status: l.status,
      })),
    };
  } catch {
    return { payments: [], leases: [] };
  }
}
