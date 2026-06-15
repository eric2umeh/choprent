import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type LedgerLineItem = {
  id: string;
  date: string;
  description: string;
  amount: number;
  kind: "charge" | "payment" | "adjustment";
};

export async function getTenantLedger(
  orgId: string,
  unitId: string,
  demoMode: boolean
): Promise<{ lines: LedgerLineItem[]; balance: number }> {
  if (demoMode) {
    const { MOCK_TENANT_LEDGER } = await import("@/lib/mock/data");
    const balance = MOCK_TENANT_LEDGER.reduce((s, l) => s + l.amount, 0);
    return {
      balance,
      lines: MOCK_TENANT_LEDGER.map((l) => ({
        id: l.id,
        date: l.date,
        description: l.description,
        amount: Math.abs(l.amount),
        kind:
          l.kind === "payment"
            ? ("payment" as const)
            : l.kind === "arrears"
              ? ("adjustment" as const)
              : ("charge" as const),
      })),
    };
  }

  const supabase = await createClient();

  const { data: periods } = await supabase
    .from("ledger_periods")
    .select("id, period_start, expected_total_ngn, paid_total_ngn, arrears_opening_ngn")
    .eq("unit_id", unitId)
    .order("period_start", { ascending: false });

  const periodIds = (periods ?? []).map((p) => p.id);

  let ledgerLines: LedgerLineItem[] = [];

  if (periodIds.length > 0) {
    const { data: lines } = await supabase
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

  const { data: payments } = await supabase
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

  const combined = [...paymentLines, ...ledgerLines].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const { data: unit } = await supabase
    .from("units")
    .select("arrears_balance_ngn")
    .eq("id", unitId)
    .maybeSingle();

  let balance = Number(unit?.arrears_balance_ngn ?? 0);
  if (periods?.length) {
    for (const p of periods) {
      balance += Math.max(
        Number(p.expected_total_ngn) +
          Number(p.arrears_opening_ngn) -
          Number(p.paid_total_ngn),
        0
      );
    }
  }

  if (combined.length === 0 && balance === 0) {
    try {
      const admin = createAdminClient();
      const { data: adminUnit } = await admin
        .from("units")
        .select("arrears_balance_ngn")
        .eq("id", unitId)
        .maybeSingle();
      balance = Number(adminUnit?.arrears_balance_ngn ?? 0);
    } catch {
      /* ignore */
    }
  }

  return { lines: combined, balance };
}
