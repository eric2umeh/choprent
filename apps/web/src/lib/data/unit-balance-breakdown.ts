import { createAdminClient } from "@/lib/supabase/admin";
import { listBillingPeriods } from "@/lib/charges/period-ranges";
import { repairStaleLedgerPeriodsForUnit } from "@/lib/charges/generate-ledger";
import {
  computeUnitOutstanding,
  sumUnallocatedCredits,
} from "@/lib/data/unit-outstanding";

export type BalanceBreakdownRow = {
  periodLabel: string;
  kind: string;
  kindKey: string;
  balance: number;
};

const KIND_LABELS: Record<string, string> = {
  rent: "Rent",
  service: "Service charge",
  agency: "Agency fee",
  vat: "VAT",
  diesel: "Diesel",
  security: "Security",
  deposit: "Deposit",
  other: "Other",
  arrears: "Prior arrears",
  expense: "Expense",
};

function kindLabel(key: string): string {
  return KIND_LABELS[key] ?? key;
}

/** Outstanding balance grouped by billing period and charge type for record-cash UI. */
export async function getUnitBalanceBreakdown(
  orgId: string,
  unitId: string
): Promise<{ rows: BalanceBreakdownRow[]; total: number }> {
  const admin = createAdminClient();

  await repairStaleLedgerPeriodsForUnit(admin, orgId, unitId);

  const { data: unit } = await admin
    .from("units")
    .select("id, arrears_balance_ngn, organization_id")
    .eq("id", unitId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!unit) return { rows: [], total: 0 };

  const { data: lease } = await admin
    .from("leases")
    .select("start_date, end_date, billing_cadence")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .maybeSingle();

  const periodLabelsByStart = new Map<string, string>();
  if (lease) {
    for (const period of listBillingPeriods(
      lease.start_date,
      lease.end_date,
      lease.billing_cadence
    )) {
      periodLabelsByStart.set(period.periodStart, period.periodLabel);
    }
  }

  const buckets = new Map<string, number>();
  const arrears = Number(unit.arrears_balance_ngn ?? 0);
  if (arrears > 0) {
    buckets.set("prior|arrears", arrears);
  }

  const { data: periods } = await admin
    .from("ledger_periods")
    .select(
      "id, period_start, expected_total_ngn, paid_total_ngn, arrears_opening_ngn"
    )
    .eq("unit_id", unitId)
    .eq("status", "open")
    .order("period_start", { ascending: true });

  const schedulePeriods = (periods ?? []).filter(
    (period) =>
      periodLabelsByStart.size === 0 ||
      periodLabelsByStart.has(period.period_start)
  );

  for (const period of schedulePeriods) {
    const owed = Math.max(
      Number(period.expected_total_ngn) +
        Number(period.arrears_opening_ngn) -
        Number(period.paid_total_ngn),
      0
    );
    if (owed <= 0) continue;

    const periodLabel =
      periodLabelsByStart.get(period.period_start) ??
      String(period.period_start).slice(0, 4);

    const { data: lines } = await admin
      .from("ledger_lines")
      .select("amount_ngn, description, charge_templates(charge_kind)")
      .eq("ledger_period_id", period.id)
      .eq("kind", "expected");

    if (!lines?.length) {
      const key = `${periodLabel}|rent`;
      buckets.set(key, (buckets.get(key) ?? 0) + owed);
      continue;
    }

    let lineSum = 0;
    const byKind = new Map<string, number>();
    for (const line of lines) {
      const ct = line.charge_templates;
      const kind =
        ct && typeof ct === "object" && !Array.isArray(ct) && "charge_kind" in ct
          ? String((ct as { charge_kind: string }).charge_kind)
          : "rent";
      const amt = Number(line.amount_ngn);
      lineSum += amt;
      byKind.set(kind, (byKind.get(kind) ?? 0) + amt);
    }

    const base = lineSum > 0 ? lineSum : owed;
    for (const [kind, amt] of byKind) {
      const share = owed * (amt / base);
      const key = `${periodLabel}|${kind}`;
      buckets.set(key, (buckets.get(key) ?? 0) + share);
    }
  }

  const [{ data: expenses }, { data: payments }] = await Promise.all([
    admin
      .from("property_expenses")
      .select("amount_ngn, expense_date")
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
    periods: schedulePeriods,
    expenseAmounts: (expenses ?? []).map((e) => Number(e.amount_ngn)),
    unallocatedCredits: sumUnallocatedCredits(payments ?? []),
  });

  // Spread remaining expense outstanding across expense years (net of credits).
  if (expenseOutstanding > 0 && (expenses ?? []).length > 0) {
    const expenseGross = (expenses ?? []).reduce(
      (sum, e) => sum + Math.max(0, Number(e.amount_ngn)),
      0
    );
    const coverRatio =
      expenseGross > 0 ? expenseOutstanding / expenseGross : 0;
    for (const exp of expenses ?? []) {
      const year = String(exp.expense_date).slice(0, 4);
      const key = `${year}|expense`;
      const share = Math.max(0, Number(exp.amount_ngn)) * coverRatio;
      if (share > 0) {
        buckets.set(key, (buckets.get(key) ?? 0) + share);
      }
    }
  }

  const rows: BalanceBreakdownRow[] = [...buckets.entries()]
    .map(([key, balance]) => {
      const [periodLabel, kindKey] = key.split("|");
      return {
        periodLabel,
        kindKey,
        kind: kindLabel(kindKey),
        balance: Math.round(balance),
      };
    })
    .filter((r) => r.balance > 0)
    .sort((a, b) => {
      const periodCmp = a.periodLabel.localeCompare(b.periodLabel);
      if (periodCmp !== 0) return periodCmp;
      return a.kind.localeCompare(b.kind);
    });

  const total = rows.reduce((sum, r) => sum + r.balance, 0);
  return { rows, total };
}
