import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { repairStaleLedgerPeriodsForUnit } from "@/lib/charges/generate-ledger";
import { listBillingPeriods } from "@/lib/charges/period-ranges";

export type LedgerLineItem = {
  id: string;
  date: string;
  description: string;
  amount: number;
  kind: "charge" | "payment" | "adjustment";
};

export async function getTenantLedger(
  orgId: string,
  unitId: string
): Promise<{ lines: LedgerLineItem[]; balance: number }> {
  // Drop calendar-year leftovers (e.g. Jan–Dec split of an Apr–Mar lease)
  // before summing outstanding so tenant dashboards show one anniversary period.
  try {
    await repairStaleLedgerPeriodsForUnit(createAdminClient(), orgId, unitId);
  } catch {
    // Continue with whatever periods exist if repair fails.
  }

  try {
    return await fetchTenantLedger(orgId, unitId, false);
  } catch {
    return fetchTenantLedger(orgId, unitId, true);
  }
}

async function fetchTenantLedger(
  orgId: string,
  unitId: string,
  useAdmin: boolean
): Promise<{ lines: LedgerLineItem[]; balance: number }> {
  const client = useAdmin ? createAdminClient() : await createClient();
  const admin = createAdminClient();

  const { data: lease } = await admin
    .from("leases")
    .select("start_date, end_date, billing_cadence")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .maybeSingle();

  const expectedStarts = new Set(
    lease
      ? listBillingPeriods(
          lease.start_date,
          lease.end_date,
          lease.billing_cadence
        ).map((p) => p.periodStart)
      : []
  );

  const { data: allPeriods } = await client
    .from("ledger_periods")
    .select(
      "id, period_start, period_end, expected_total_ngn, paid_total_ngn, arrears_opening_ngn, status"
    )
    .eq("unit_id", unitId)
    .order("period_start", { ascending: false });

  // Balance only from schedule-matching open periods (ignore calendar leftovers).
  const periods = (allPeriods ?? []).filter((p) => {
    if (p.status && p.status !== "open") return false;
    if (expectedStarts.size === 0) return true;
    return expectedStarts.has(p.period_start);
  });

  const periodIds = periods.map((p) => p.id);
  let ledgerLines: LedgerLineItem[] = [];

  if (periodIds.length > 0) {
    const { data: lines } = await client
      .from("ledger_lines")
      .select("id, description, amount_ngn, kind, created_at")
      .in("ledger_period_id", periodIds)
      .order("created_at", { ascending: false });

    ledgerLines = (lines ?? []).map((l) => ({
      id: l.id,
      date: l.created_at.slice(0, 10),
      description: l.description,
      amount: -Number(l.amount_ngn),
      kind: l.kind === "expected" ? "charge" : "adjustment",
    }));
  }

  const { data: payments } = await client
    .from("payments")
    .select("id, amount_ngn, payment_date, status, created_at, period_label")
    .eq("unit_id", unitId)
    .in("status", ["verified", "auto_matched", "pending"])
    .order("created_at", { ascending: false });

  const paymentLines: LedgerLineItem[] = (payments ?? []).map((p) => ({
    id: p.id,
    date: (p.payment_date ?? p.created_at).slice(0, 10),
    description:
      p.status === "pending"
        ? `Transfer pending${p.period_label ? ` · ${p.period_label}` : ""}`
        : `Payment received${p.period_label ? ` · ${p.period_label}` : ""}`,
    amount: Number(p.amount_ngn),
    kind: "payment" as const,
  }));

  const { data: unit } = await client
    .from("units")
    .select("arrears_balance_ngn")
    .eq("id", unitId)
    .maybeSingle();

  let balance = Number(unit?.arrears_balance_ngn ?? 0);
  for (const p of periods) {
    balance += Math.max(
      Number(p.expected_total_ngn) +
        Number(p.arrears_opening_ngn) -
        Number(p.paid_total_ngn),
      0
    );
  }

  // Unit-linked expenses (e.g. AEPB / government) are billed to the shop —
  // include them in outstanding so tenant dashboards match staff breakdown.
  const { data: expenses } = await admin
    .from("property_expenses")
    .select("id, description, amount_ngn, expense_date, category")
    .eq("unit_id", unitId)
    .eq("organization_id", orgId)
    .order("expense_date", { ascending: false });

  const expenseLines: LedgerLineItem[] = (expenses ?? []).map((exp) => {
    const amount = Number(exp.amount_ngn);
    balance += Math.max(amount, 0);
    const category =
      exp.category === "government" ? "Government bill" : "Expense";
    return {
      id: `expense:${exp.id}`,
      date: String(exp.expense_date).slice(0, 10),
      description: `${category} · ${exp.description}`,
      amount: -amount,
      kind: "charge" as const,
    };
  });

  const combined = [...paymentLines, ...ledgerLines, ...expenseLines].sort(
    (a, b) => b.date.localeCompare(a.date)
  );

  if (combined.length === 0 && balance === 0 && !useAdmin) {
    return fetchTenantLedger(orgId, unitId, true);
  }

  return { lines: combined, balance };
}
