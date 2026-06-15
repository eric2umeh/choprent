import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/env";
import type { UnitListItem } from "@/lib/data/unit-types";
import { MOCK_UNITS, MOCK_ORG, type MockUnit } from "@/lib/mock/data";
import type { PropertyType, UnitStatus } from "@/types/database";

function mapMockUnit(u: MockUnit): UnitListItem {
  const propertyName =
    MOCK_ORG.sites.find((site) => site.id === u.siteId)?.name ?? null;
  return {
    id: u.id,
    unitCode: u.unitCode,
    propertyName,
    propertyType: u.propertyType,
    status: u.status,
    tenantName: u.tenantName,
    annualRent: u.annualRent,
    arrears: u.arrears,
    isComposite: u.isComposite,
    compositeNote: null,
    virtualAccount: u.virtualAccount,
  };
}

export async function listUnitsForOrg(
  orgId: string,
  demoMode: boolean,
): Promise<UnitListItem[]> {
  if (demoMode) {
    return MOCK_UNITS.map(mapMockUnit);
  }

  const supabase = await createClient();

  const { data: units, error } = await supabase
    .from("units")
    .select(
      "id, unit_code, property_type, status, arrears_balance_ngn, is_composite, composite_note, sites(name)",
    )
    .eq("organization_id", orgId)
    .order("unit_code");

  if (error || !units?.length) return [];

  const unitIds = units.map((u) => u.id);

  const [{ data: leases }, { data: accounts }] = await Promise.all([
    supabase
      .from("leases")
      .select("unit_id, tenant_display_name")
      .in("unit_id", unitIds)
      .eq("status", "active"),
    supabase
      .from("virtual_accounts")
      .select("unit_id, account_number")
      .in("unit_id", unitIds),
  ]);

  const tenantByUnit = new Map(
    (leases ?? []).map((l) => [l.unit_id, l.tenant_display_name]),
  );
  const accountByUnit = new Map(
    (accounts ?? []).map((a) => [a.unit_id, a.account_number]),
  );

  return units.map((u) => {
    const sitePayload = u.sites as { name?: string } | { name?: string }[] | null;
    const propertyName = Array.isArray(sitePayload)
      ? sitePayload[0]?.name ?? null
      : sitePayload?.name ?? null;

    return {
      id: u.id,
      unitCode: u.unit_code,
      propertyName,
      propertyType: u.property_type as PropertyType,
    status: u.status as UnitStatus,
    tenantName: tenantByUnit.get(u.id) ?? null,
    annualRent: 0,
    arrears: Number(u.arrears_balance_ngn ?? 0),
    isComposite: u.is_composite,
    compositeNote: u.composite_note,
    virtualAccount: accountByUnit.get(u.id) ?? null,
    };
  });
}

export async function getUnitDetail(
  unitId: string,
  orgId: string,
  demoMode: boolean,
): Promise<UnitListItem | null> {
  if (demoMode) {
    const u = MOCK_UNITS.find((x) => x.id === unitId);
    return u ? mapMockUnit(u) : null;
  }

  const supabase = await createClient();
  const { data: unit } = await supabase
    .from("units")
    .select(
      "id, unit_code, property_type, status, arrears_balance_ngn, is_composite, composite_note, organization_id",
    )
    .eq("id", unitId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!unit) return null;

  const [{ data: lease }, { data: account }] = await Promise.all([
    supabase
      .from("leases")
      .select("tenant_display_name")
      .eq("unit_id", unitId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("virtual_accounts")
      .select("account_number")
      .eq("unit_id", unitId)
      .maybeSingle(),
  ]);

  return {
    id: unit.id,
    unitCode: unit.unit_code,
    propertyName: null,
    propertyType: unit.property_type as PropertyType,
    status: unit.status as UnitStatus,
    tenantName: lease?.tenant_display_name ?? null,
    annualRent: 0,
    arrears: Number(unit.arrears_balance_ngn ?? 0),
    isComposite: unit.is_composite,
    compositeNote: unit.composite_note,
    virtualAccount: account?.account_number ?? null,
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
