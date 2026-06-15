import { createClient } from "@/lib/supabase/server";
import { MOCK_STATS, MOCK_UNITS } from "@/lib/mock/data";

export type DashboardStats = {
  year: number;
  collectedThisYear: number;
  expectedThisYear: number;
  pastYearsArrears: number;
  pendingVerifications: number;
  occupiedUnits: number;
  totalUnits: number;
  vacantUnits: number;
};

function currentYearBounds() {
  const year = new Date().getFullYear();
  return {
    year,
    start: `${year}-01-01`,
    end: `${year + 1}-01-01`,
  };
}

export async function getDashboardStats(
  orgId: string,
  demoMode: boolean
): Promise<DashboardStats> {
  const { year, start, end } = currentYearBounds();

  if (demoMode) {
    const occupiedUnits = MOCK_UNITS.filter((u) => u.status === "occupied").length;
    const vacantUnits = MOCK_UNITS.filter((u) => u.status === "vacant").length;
    const pastYearsArrears = MOCK_UNITS.reduce((sum, u) => sum + u.arrears, 0);

    return {
      year,
      collectedThisYear: MOCK_STATS.collected,
      expectedThisYear: MOCK_STATS.expected,
      pastYearsArrears,
      pendingVerifications: MOCK_STATS.pendingVerifications,
      occupiedUnits,
      totalUnits: MOCK_UNITS.length,
      vacantUnits,
    };
  }

  const supabase = await createClient();

  const [{ data: units }, { data: periods }, { count: pendingCount }] =
    await Promise.all([
      supabase
        .from("units")
        .select("status, arrears_balance_ngn")
        .eq("organization_id", orgId),
      supabase
        .from("ledger_periods")
        .select("expected_total_ngn, paid_total_ngn, units!inner(organization_id)")
        .eq("units.organization_id", orgId)
        .gte("period_start", start)
        .lt("period_start", end),
      supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "pending"),
    ]);

  const unitRows = units ?? [];
  const periodRows = periods ?? [];

  const expectedThisYear = periodRows.reduce(
    (sum, row) => sum + Number(row.expected_total_ngn ?? 0),
    0
  );
  const collectedThisYear = periodRows.reduce(
    (sum, row) => sum + Number(row.paid_total_ngn ?? 0),
    0
  );
  const pastYearsArrears = unitRows.reduce(
    (sum, row) => sum + Number(row.arrears_balance_ngn ?? 0),
    0
  );

  return {
    year,
    collectedThisYear,
    expectedThisYear,
    pastYearsArrears,
    pendingVerifications: pendingCount ?? 0,
    occupiedUnits: unitRows.filter((u) => u.status === "occupied").length,
    totalUnits: unitRows.length,
    vacantUnits: unitRows.filter((u) => u.status === "vacant").length,
  };
}
