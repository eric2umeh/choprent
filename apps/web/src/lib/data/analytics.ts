import { createAdminClient } from "@/lib/supabase/admin";
import type { PropertyType } from "@/types/database";

export type PortfolioMetrics = {
  year: number;
  collectionRate: number;
  occupancyRate: number;
  totalUnits: number;
  occupiedUnits: number;
  totalArrears: number;
  totalExpected: number;
  totalCollected: number;
  totalExpenses: number;
  netMarginPct: number;
  arrearsByType: { type: PropertyType; arrears: number; unitCount: number }[];
};

export type RentAdvisorItem = {
  unitId: string;
  unitCode: string;
  propertyName: string;
  tenantName: string;
  annualRent: number;
  collectionRate: number;
  arrears: number;
  leaseEndDate: string;
  daysToRenewal: number;
  recommendation: "increase" | "hold" | "reduce";
  suggestedPct: number;
  reasoning: string;
};

function currentYearBounds() {
  const year = new Date().getFullYear();
  return {
    year,
    start: `${year}-01-01`,
    end: `${year + 1}-01-01`,
  };
}

export async function getPortfolioMetrics(orgId: string): Promise<PortfolioMetrics> {
  const { year, start, end } = currentYearBounds();

  try {
    const admin = createAdminClient();

    const [{ data: units }, { data: periods }, { data: expenses }] = await Promise.all([
      admin
        .from("units")
        .select("id, status, property_type, arrears_balance_ngn")
        .eq("organization_id", orgId),
      admin
        .from("ledger_periods")
        .select("expected_total_ngn, paid_total_ngn, units!inner(organization_id)")
        .eq("units.organization_id", orgId)
        .gte("period_start", start)
        .lt("period_start", end),
      admin
        .from("property_expenses")
        .select("amount_ngn")
        .eq("organization_id", orgId)
        .gte("expense_date", start)
        .lt("expense_date", end),
    ]);

    const unitRows = units ?? [];
    const periodRows = periods ?? [];
    const totalExpected = periodRows.reduce(
      (sum, row) => sum + Number(row.expected_total_ngn ?? 0),
      0
    );
    const totalCollected = periodRows.reduce(
      (sum, row) => sum + Number(row.paid_total_ngn ?? 0),
      0
    );
    const totalExpenses = (expenses ?? []).reduce(
      (sum, row) => sum + Number(row.amount_ngn),
      0
    );
    const totalArrears = unitRows.reduce(
      (sum, row) => sum + Number(row.arrears_balance_ngn ?? 0),
      0
    );
    const occupiedUnits = unitRows.filter((u) => u.status === "occupied").length;
    const totalUnits = unitRows.length;

    const typeMap = new Map<PropertyType, { arrears: number; unitCount: number }>();
    for (const unit of unitRows) {
      const type = unit.property_type as PropertyType;
      const entry = typeMap.get(type) ?? { arrears: 0, unitCount: 0 };
      entry.arrears += Number(unit.arrears_balance_ngn ?? 0);
      entry.unitCount += 1;
      typeMap.set(type, entry);
    }

    const net = totalCollected - totalExpenses;

    return {
      year,
      collectionRate:
        totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
      occupancyRate:
        totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
      totalUnits,
      occupiedUnits,
      totalArrears,
      totalExpected,
      totalCollected,
      totalExpenses,
      netMarginPct:
        totalCollected > 0 ? Math.round((net / totalCollected) * 100) : 0,
      arrearsByType: [...typeMap.entries()]
        .map(([type, stats]) => ({ type, ...stats }))
        .sort((a, b) => b.arrears - a.arrears),
    };
  } catch {
    return {
      year,
      collectionRate: 0,
      occupancyRate: 0,
      totalUnits: 0,
      occupiedUnits: 0,
      totalArrears: 0,
      totalExpected: 0,
      totalCollected: 0,
      totalExpenses: 0,
      netMarginPct: 0,
      arrearsByType: [],
    };
  }
}

export async function getRentAdvisor(orgId: string): Promise<RentAdvisorItem[]> {
  const { start, end } = currentYearBounds();
  const renewalWindowDays = 120;
  const today = new Date();

  try {
    const admin = createAdminClient();

    const { data: leases } = await admin
      .from("leases")
      .select(
        "id, tenant_display_name, end_date, units!inner(id, unit_code, organization_id, arrears_balance_ngn, sites(name), ledger_periods(expected_total_ngn, paid_total_ngn, period_start))"
      )
      .eq("status", "active")
      .eq("units.organization_id", orgId);

    const items: RentAdvisorItem[] = [];

    for (const lease of leases ?? []) {
      const unitsPayload = lease.units;
      const units = (
        Array.isArray(unitsPayload) ? unitsPayload[0] : unitsPayload
      ) as {
        id: string;
        unit_code: string;
        arrears_balance_ngn: number;
        sites: { name: string } | { name: string }[] | null;
        ledger_periods:
          | { expected_total_ngn: number; paid_total_ngn: number; period_start: string }[]
          | null;
      } | null;

      if (!units) continue;

      const endDate = new Date(lease.end_date);
      const daysToRenewal = Math.ceil(
        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysToRenewal > renewalWindowDays || daysToRenewal < -30) continue;

      const periods = units.ledger_periods ?? [];
      const currentPeriods = periods.filter(
        (p) => p.period_start >= start && p.period_start < end
      );
      const expected = currentPeriods.reduce(
        (sum, p) => sum + Number(p.expected_total_ngn),
        0
      );
      const paid = currentPeriods.reduce(
        (sum, p) => sum + Number(p.paid_total_ngn),
        0
      );
      const collectionRate =
        expected > 0 ? Math.round((paid / expected) * 100) : paid > 0 ? 100 : 0;
      const arrears = Number(units.arrears_balance_ngn ?? 0);
      const annualRent = expected > 0 ? expected : paid;

      let recommendation: RentAdvisorItem["recommendation"] = "hold";
      let suggestedPct = 0;
      let reasoning = "";

      if (collectionRate >= 95 && arrears <= 0) {
        recommendation = "increase";
        suggestedPct = 8;
        reasoning =
          "Strong collection with no arrears — room for a moderate increase at renewal.";
      } else if (collectionRate >= 85 && arrears < annualRent * 0.05) {
        recommendation = "increase";
        suggestedPct = 5;
        reasoning =
          "Reliable payer with low arrears — a modest increase is reasonable.";
      } else if (collectionRate < 70 || arrears > annualRent * 0.15) {
        recommendation = "hold";
        suggestedPct = 0;
        reasoning =
          "Collection or arrears are weak — hold rent and focus on recovery before increasing.";
      } else {
        recommendation = "hold";
        suggestedPct = 0;
        reasoning =
          "Mixed performance — hold rent this cycle and revisit after arrears clear.";
      }

      const site = units.sites;
      const propertyName = Array.isArray(site) ? site[0]?.name : site?.name;

      items.push({
        unitId: units.id,
        unitCode: units.unit_code,
        propertyName: propertyName ?? "Property",
        tenantName: lease.tenant_display_name,
        annualRent,
        collectionRate,
        arrears,
        leaseEndDate: lease.end_date,
        daysToRenewal,
        recommendation,
        suggestedPct,
        reasoning,
      });
    }

    return items.sort((a, b) => a.daysToRenewal - b.daysToRenewal);
  } catch {
    return [];
  }
}
