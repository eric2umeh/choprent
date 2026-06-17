import { createAdminClient } from "@/lib/supabase/admin";
import type { BillingCadence } from "@/types/database";

export type LeaseListItem = {
  id: string;
  unitId: string;
  unitCode: string;
  tenantName: string;
  tenantPhone: string | null;
  tenantEmail: string | null;
  startDate: string;
  endDate: string;
  billingCadence: BillingCadence;
  status: "draft" | "active" | "ended" | "renewed";
  annualTotal: number;
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
  units: { unit_code: string } | { unit_code: string }[] | null;
};

function unitCodeFromRow(units: LeaseRow["units"]): string {
  if (!units) return "—";
  if (Array.isArray(units)) return units[0]?.unit_code ?? "—";
  return units.unit_code;
}

function currentYearBounds() {
  const year = new Date().getFullYear();
  return {
    year,
    start: `${year}-01-01`,
    end: `${year + 1}-01-01`,
  };
}

async function annualTotalForLease(
  admin: ReturnType<typeof createAdminClient>,
  leaseId: string,
  unitId: string
): Promise<number> {
  const { start, end } = currentYearBounds();

  const { data: periods } = await admin
    .from("ledger_periods")
    .select("expected_total_ngn, status, lease_id, period_start")
    .eq("unit_id", unitId)
    .gte("period_start", start)
    .lt("period_start", end)
    .order("period_start", { ascending: false });

  if (periods?.length) {
    const forLease = periods.filter((p) => p.lease_id === leaseId);
    const relevant = forLease.length > 0 ? forLease : periods;
    const openTotal = relevant
      .filter((p) => p.status === "open")
      .reduce((sum, p) => sum + Number(p.expected_total_ngn), 0);
    if (openTotal > 0) return openTotal;
    return Number(relevant[0].expected_total_ngn);
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

  return Number(template?.amount ?? 0);
}

async function mapLeaseRows(
  rows: LeaseRow[],
  admin: ReturnType<typeof createAdminClient>
): Promise<LeaseListItem[]> {
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      unitId: row.unit_id,
      unitCode: unitCodeFromRow(row.units),
      tenantName: row.tenant_display_name,
      tenantPhone: row.tenant_phone,
      tenantEmail: row.tenant_email,
      startDate: row.start_date,
      endDate: row.end_date,
      billingCadence: row.billing_cadence,
      status: row.status,
      annualTotal: await annualTotalForLease(admin, row.id, row.unit_id),
    }))
  );
}

export async function listLeasesForOrg(orgId: string): Promise<LeaseListItem[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("leases")
      .select(
        "id, unit_id, tenant_display_name, tenant_phone, tenant_email, start_date, end_date, billing_cadence, status, units!inner(unit_code, organization_id)"
      )
      .eq("units.organization_id", orgId)
      .order("start_date", { ascending: false });

    if (!data) return [];
    return mapLeaseRows(data as LeaseRow[], admin);
  } catch {
    return [];
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
        .in("status", ["vacant", "maintenance"])
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
