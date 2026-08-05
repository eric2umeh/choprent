/**
 * Shared outstanding math for rent periods + unit-linked expenses (AEPB, etc.).
 *
 * Expense payments are not allocated against `property_expenses` today — surplus
 * on open ledger periods and `metadata.unallocated_credit_ngn` cover them instead.
 */
export function computeUnitOutstanding(input: {
  arrearsBalance: number;
  periods: Array<{
    expected_total_ngn: number;
    paid_total_ngn: number;
    arrears_opening_ngn: number;
  }>;
  expenseAmounts: number[];
  /** Sum of verified/auto_matched payment metadata.unallocated_credit_ngn */
  unallocatedCredits?: number;
}): {
  rentOutstanding: number;
  expenseGross: number;
  expenseOutstanding: number;
  paymentSurplus: number;
  balance: number;
} {
  let rentOutstanding = Math.max(0, Number(input.arrearsBalance ?? 0));
  let paymentSurplus = 0;

  for (const period of input.periods) {
    const due =
      Number(period.expected_total_ngn) + Number(period.arrears_opening_ngn);
    const paid = Number(period.paid_total_ngn);
    const delta = due - paid;
    if (delta > 0) rentOutstanding += delta;
    else paymentSurplus += -delta;
  }

  const expenseGross = input.expenseAmounts.reduce(
    (sum, amount) => sum + Math.max(0, Number(amount) || 0),
    0
  );
  const credits =
    paymentSurplus + Math.max(0, Number(input.unallocatedCredits ?? 0));
  const expenseOutstanding = Math.max(0, expenseGross - credits);

  return {
    rentOutstanding,
    expenseGross,
    expenseOutstanding,
    paymentSurplus,
    balance: rentOutstanding + expenseOutstanding,
  };
}

export function sumUnallocatedCredits(
  payments: Array<{
    status?: string | null;
    metadata?: unknown;
  }>
): number {
  let total = 0;
  for (const payment of payments) {
    const status = payment.status ?? "";
    if (status !== "verified" && status !== "auto_matched") continue;
    const meta = payment.metadata;
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) continue;
    const credit = Number(
      (meta as { unallocated_credit_ngn?: unknown }).unallocated_credit_ngn ?? 0
    );
    if (Number.isFinite(credit) && credit > 0) total += credit;
  }
  return total;
}
