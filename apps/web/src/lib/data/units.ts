import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UnitListItem, UnitDetail } from "@/lib/data/unit-types";
import type { PropertyType, UnitStatus } from "@/types/database";

type UnitRow = {
  id: string;
  site_id: string;
  unit_code: string;
  property_type: PropertyType;
  status: UnitStatus;
  arrears_balance_ngn: number;
  is_composite: boolean;
  composite_note: string | null;
  sites: { name?: string } | { name?: string }[] | null;
};

function propertyNameFromRow(sites: UnitRow["sites"]): string | null {
  if (!sites) return null;
  if (Array.isArray(sites)) return sites[0]?.name ?? null;
  return sites.name ?? null;
}

async function mapUnitRows(rows: UnitRow[]): Promise<UnitListItem[]> {
  if (!rows.length) return [];

  const admin = createAdminClient();
  const unitIds = rows.map((u) => u.id);

  const [{ data: leases }, { data: accounts }, { data: periods }] = await Promise.all([
    admin
      .from("leases")
      .select("unit_id, tenant_display_name")
      .in("unit_id", unitIds)
      .eq("status", "active"),
    admin
      .from("virtual_accounts")
      .select("unit_id, account_number")
      .in("unit_id", unitIds),
    admin
      .from("ledger_periods")
      .select("unit_id, expected_total_ngn, status")
      .in("unit_id", unitIds)
      .eq("status", "open"),
  ]);

  const tenantByUnit = new Map(
    (leases ?? []).map((l) => [l.unit_id, l.tenant_display_name])
  );
  const accountByUnit = new Map(
    (accounts ?? []).map((a) => [a.unit_id, a.account_number])
  );
  const rentByUnit = new Map<string, number>();
  for (const period of periods ?? []) {
    rentByUnit.set(period.unit_id, Number(period.expected_total_ngn ?? 0));
  }

  return rows.map((u) => ({
    id: u.id,
    siteId: u.site_id,
    unitCode: u.unit_code,
    propertyName: propertyNameFromRow(u.sites),
    propertyType: u.property_type,
    status: u.status,
    tenantName: tenantByUnit.get(u.id) ?? null,
    annualRent: rentByUnit.get(u.id) ?? 0,
    arrears: Number(u.arrears_balance_ngn ?? 0),
    isComposite: u.is_composite,
    compositeNote: u.composite_note,
    virtualAccount: accountByUnit.get(u.id) ?? null,
  }));
}

export async function listUnitsForOrg(
  orgId: string,
  siteId?: string
): Promise<UnitListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("units")
    .select(
      "id, site_id, unit_code, property_type, status, arrears_balance_ngn, is_composite, composite_note, sites(name)"
    )
    .eq("organization_id", orgId)
    .order("unit_code");

  if (siteId) {
    query = query.eq("site_id", siteId);
  }

  const { data, error } = await query;

  if (error || !data) {
    try {
      const admin = createAdminClient();
      let adminQuery = admin
        .from("units")
        .select(
          "id, site_id, unit_code, property_type, status, arrears_balance_ngn, is_composite, composite_note, sites(name)"
        )
        .eq("organization_id", orgId)
        .order("unit_code");
      if (siteId) adminQuery = adminQuery.eq("site_id", siteId);
      const { data: adminRows } = await adminQuery;
      return mapUnitRows((adminRows as UnitRow[] | null) ?? []);
    } catch {
      return [];
    }
  }

  return mapUnitRows(data as UnitRow[]);
}

export async function getUnitDetail(
  unitId: string,
  orgId: string
): Promise<UnitDetail | null> {
  const supabase = await createClient();
  const { data: unit, error } = await supabase
    .from("units")
    .select(
      "id, site_id, unit_code, property_type, status, arrears_balance_ngn, is_composite, composite_note, organization_id, sites(name)"
    )
    .eq("id", unitId)
    .eq("organization_id", orgId)
    .maybeSingle();

  let row = unit as UnitRow | null;

  if (error || !unit) {
    try {
      const admin = createAdminClient();
      const { data: adminUnit } = await admin
        .from("units")
        .select(
          "id, site_id, unit_code, property_type, status, arrears_balance_ngn, is_composite, composite_note, organization_id, sites(name)"
        )
        .eq("id", unitId)
        .eq("organization_id", orgId)
        .maybeSingle();
      row = (adminUnit as UnitRow | null) ?? null;
    } catch {
      return null;
    }
  }

  if (!row) return null;

  const mapped = await mapUnitRows([row]);
  const base = mapped[0];
  if (!base) return null;

  const admin = createAdminClient();
  const { data: lease } = await admin
    .from("leases")
    .select("id, tenant_phone, tenant_email")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .maybeSingle();

  return {
    ...base,
    leaseId: lease?.id ?? null,
    tenantPhone: lease?.tenant_phone ?? null,
    tenantEmail: lease?.tenant_email ?? null,
  };
}

export async function getDefaultSiteId(orgId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("id")
    .eq("organization_id", orgId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
