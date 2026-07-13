import { sortByNaturalKey } from "@/lib/utils/natural-sort";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BillingCadence } from "@/types/database";
import { slugify } from "@/lib/utils/slug";
import {
  deriveTenantPaymentStatus,
  type TenantPaymentStatus,
} from "@/lib/data/tenant-payment-status";
import { actorLabel, resolveActorLabels } from "@/lib/data/audit-actors";

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
  startDate: string;
  endDate: string;
  billingCadence: BillingCadence;
  status: "draft" | "active" | "ended" | "renewed";
  annualTotal: number;
  paidAmount: number;
  arrears: number;
  paymentStatus: TenantPaymentStatus;
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
  start_date: string;
  end_date: string;
  billing_cadence: BillingCadence;
  status: LeaseListItem["status"];
  created_at?: string;
  created_by?: string | null;
  units:
    | {
        unit_code: string;
        site_id: string;
        arrears_balance_ngn: number;
        sites: { name: string; slug?: string } | { name: string; slug?: string }[] | null;
      }
    | {
        unit_code: string;
        site_id: string;
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

function currentYearBounds() {
  const year = new Date().getFullYear();
  return {
    year,
    start: `${year}-01-01`,
    end: `${year + 1}-01-01`,
  };
}

async function getLeaseFinancials(
  admin: ReturnType<typeof createAdminClient>,
  leaseId: string,
  unitId: string,
  arrearsBalance: number
): Promise<{ expected: number; paid: number; arrears: number }> {
  const { start, end } = currentYearBounds();
  const arrears = Number(arrearsBalance ?? 0);

  const { data: periods } = await admin
    .from("ledger_periods")
    .select("expected_total_ngn, paid_total_ngn, status, lease_id, period_start")
    .eq("unit_id", unitId)
    .gte("period_start", start)
    .lt("period_start", end)
    .order("period_start", { ascending: false });

  if (periods?.length) {
    const forLease = periods.filter((p) => p.lease_id === leaseId);
    const relevant = forLease.length > 0 ? forLease : periods;
    const expected = relevant.reduce(
      (sum, p) => sum + Number(p.expected_total_ngn),
      0
    );
    const paid = relevant.reduce((sum, p) => sum + Number(p.paid_total_ngn), 0);
    if (expected > 0) {
      return { expected, paid, arrears };
    }
  }

  const { data: template } = await admin
    .from("charge_templates")
    .select("amount")
    .eq("scope", "unit")
    .eq("scope_id", unitId)
    .eq("charge_kind", "rent")
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  const expected = Number(template?.amount ?? 0);
  return { expected, paid: 0, arrears };
}

async function mapLeaseRows(
  rows: LeaseRow[],
  admin: ReturnType<typeof createAdminClient>
): Promise<LeaseListItem[]> {
  return Promise.all(
    rows.map(async (row) => {
      const unit = unitFromRow(row.units);
      const { expected, paid, arrears } = await getLeaseFinancials(
        admin,
        row.id,
        row.unit_id,
        unit?.arrears_balance_ngn ?? 0
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
        startDate: row.start_date,
        endDate: row.end_date,
        billingCadence: row.billing_cadence,
        status: row.status,
        annualTotal: expected,
        paidAmount: paid,
        arrears,
        paymentStatus: deriveTenantPaymentStatus(expected, paid, arrears),
      };
    })
  );
}

const leaseSelect =
  "id, unit_id, tenant_display_name, tenant_phone, tenant_email, start_date, end_date, billing_cadence, status, created_at, created_by, units!inner(unit_code, site_id, organization_id, arrears_balance_ngn, sites(name, slug))";

export async function listLeasesForOrg(orgId: string): Promise<LeaseListItem[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("leases")
      .select(leaseSelect)
      .eq("units.organization_id", orgId)
      .order("start_date", { ascending: false });

    if (!data) return [];
    const leases = await mapLeaseRows(data as LeaseRow[], admin);
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

    const mapped = (await mapLeaseRows([row as LeaseRow], admin))[0];

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
): Promise<{ id: string; unitCode: string; siteId: string }[]> {
  try {
    const admin = createAdminClient();
    const [{ data: units }, { data: activeLeases }] = await Promise.all([
      admin
        .from("units")
        .select("id, unit_code, site_id")
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
