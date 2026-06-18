import { createAdminClient } from "@/lib/supabase/admin";

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

export async function getDashboardStats(orgId: string): Promise<DashboardStats> {
  const { year, start, end } = currentYearBounds();

  try {
    const admin = createAdminClient();

    const [{ data: units }, { data: periods }, { count: pendingCount }] =
      await Promise.all([
        admin
          .from("units")
          .select("status, arrears_balance_ngn")
          .eq("organization_id", orgId),
        admin
          .from("ledger_periods")
          .select("expected_total_ngn, paid_total_ngn, units!inner(organization_id)")
          .eq("units.organization_id", orgId)
          .gte("period_start", start)
          .lt("period_start", end),
        admin
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("status", "pending"),
      ]);

    const unitRows = units ?? [];
    const periodRows = periods ?? [];

    return {
      year,
      collectedThisYear: periodRows.reduce(
        (sum, row) => sum + Number(row.paid_total_ngn ?? 0),
        0
      ),
      expectedThisYear: periodRows.reduce(
        (sum, row) => sum + Number(row.expected_total_ngn ?? 0),
        0
      ),
      pastYearsArrears: unitRows.reduce(
        (sum, row) => sum + Number(row.arrears_balance_ngn ?? 0),
        0
      ),
      pendingVerifications: pendingCount ?? 0,
      occupiedUnits: unitRows.filter((u) => u.status === "occupied").length,
      totalUnits: unitRows.length,
      vacantUnits: unitRows.filter((u) => u.status === "vacant").length,
    };
  } catch {
    return {
      year,
      collectedThisYear: 0,
      expectedThisYear: 0,
      pastYearsArrears: 0,
      pendingVerifications: 0,
      occupiedUnits: 0,
      totalUnits: 0,
      vacantUnits: 0,
    };
  }
}
