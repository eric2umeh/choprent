import { createAdminClient } from "@/lib/supabase/admin";

export type BalanceBreakdownRow = {
  year: string;
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

/** Outstanding balance grouped by calendar year and charge type for record-cash UI. */
export async function getUnitBalanceBreakdown(
  orgId: string,
  unitId: string
): Promise<{ rows: BalanceBreakdownRow[]; total: number }> {
  const admin = createAdminClient();

  const { data: unit } = await admin
    .from("units")
    .select("id, arrears_balance_ngn, organization_id")
    .eq("id", unitId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!unit) return { rows: [], total: 0 };

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

  for (const period of periods ?? []) {
    const owed = Math.max(
      Number(period.expected_total_ngn) +
        Number(period.arrears_opening_ngn) -
        Number(period.paid_total_ngn),
      0
    );
    if (owed <= 0) continue;

    const year = String(period.period_start).slice(0, 4);

    const { data: lines } = await admin
      .from("ledger_lines")
      .select("amount_ngn, charge_templates(charge_kind)")
      .eq("ledger_period_id", period.id)
      .eq("kind", "expected");

    if (!lines?.length) {
      const key = `${year}|rent`;
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
      const key = `${year}|${kind}`;
      buckets.set(key, (buckets.get(key) ?? 0) + share);
    }
  }

  const { data: expenses } = await admin
    .from("property_expenses")
    .select("amount_ngn, expense_date, description")
    .eq("unit_id", unitId)
    .eq("organization_id", orgId);

  for (const exp of expenses ?? []) {
    const year = String(exp.expense_date).slice(0, 4);
    const key = `${year}|expense`;
    buckets.set(key, (buckets.get(key) ?? 0) + Number(exp.amount_ngn));
  }

  const rows: BalanceBreakdownRow[] = [...buckets.entries()]
    .map(([key, balance]) => {
      const [year, kindKey] = key.split("|");
      return {
        year,
        kindKey,
        kind: kindLabel(kindKey),
        balance: Math.round(balance),
      };
    })
    .filter((r) => r.balance > 0)
    .sort((a, b) => {
      const yearCmp = a.year.localeCompare(b.year);
      if (yearCmp !== 0) return yearCmp;
      return a.kind.localeCompare(b.kind);
    });

  const total = rows.reduce((sum, r) => sum + r.balance, 0);
  return { rows, total };
}
