import { createClient } from "@/lib/supabase/server";
import { getTenantLedger } from "@/lib/data/ledger";
import { formatBillingPeriodLabel } from "@/lib/charges/period-ranges";
import { isPaystackDvaEnabled } from "@/lib/paystack/client";
import type { TenantPaymentStatus } from "@/lib/data/tenant-payment-status";

export type SettlementAccount = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDva?: boolean;
};

export type TenantHomeSummary = {
  balance: number;
  periodLabel: string | null;
  rentStatus: TenantPaymentStatus;
  /** Dedicated shop VA when enabled and no settlement account is assigned. */
  dva: SettlementAccount | null;
  /** Resolved rent-collection account (lease → unit → property default). */
  collectionAccount: SettlementAccount | null;
  /** Single pay-to account shown on the tenant dashboard. */
  settlement: SettlementAccount | null;
  pendingPayments: number;
  recentLines: {
    id: string;
    label: string;
    amount: number;
    kind: "charge" | "payment" | "adjustment";
  }[];
};

export async function getTenantHomeSummary(
  orgId: string,
  unitId: string,
  leaseId: string
): Promise<TenantHomeSummary> {
  const { lines, balance } = await getTenantLedger(orgId, unitId);
  const supabase = await createClient();
  const adminFallback = async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    return createAdminClient();
  };

  const dvaEnabled = isPaystackDvaEnabled();
  const [{ count: pendingCount }, dva, periodInfo] = await Promise.all([
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", unitId)
        .eq("status", "pending"),
      dvaEnabled ? resolveDvaAccount(supabase, unitId) : Promise.resolve(null),
      supabase
        .from("ledger_periods")
        .select(
          "period_start, period_end, expected_total_ngn, paid_total_ngn, arrears_opening_ngn"
        )
        .eq("unit_id", unitId)
        .eq("status", "open")
        .order("period_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // Always resolve via admin so staff account changes are visible immediately
  // (tenant RLS can hide or lag settlement_account_id updates).
  let resolvedCollection: SettlementAccount | null = null;
  try {
    const admin = await adminFallback();
    resolvedCollection = await resolveSettlementAccountAdmin(
      admin,
      leaseId,
      unitId
    );
  } catch {
    resolvedCollection = await resolveSettlementAccount(
      supabase,
      leaseId,
      unitId
    );
  }

  const openPeriod = periodInfo.data;
  const periodLabel =
    openPeriod?.period_start && openPeriod?.period_end
      ? formatBillingPeriodLabel(openPeriod.period_start, openPeriod.period_end)
      : openPeriod?.period_start?.slice(0, 4) ?? null;

  const expected = Number(openPeriod?.expected_total_ngn ?? 0);
  const paid = Number(openPeriod?.paid_total_ngn ?? 0);

  // Status follows true outstanding (rent + arrears + unit expenses like AEPB).
  // "Paid" only when nothing is owed; remaining bills after rent show as in debt.
  let rentStatus: TenantPaymentStatus;
  if (balance <= 0) {
    rentStatus = "paid";
  } else if (paid > 0 && paid < expected) {
    rentStatus = "partial";
  } else {
    rentStatus = "debt";
  }

  // Prefer staff-assigned settlement; only fall back to DVA when none is set.
  const payAccount = resolvedCollection ?? dva;

  return {
    balance,
    periodLabel,
    rentStatus,
    dva: resolvedCollection ? null : dva,
    collectionAccount: resolvedCollection,
    settlement: payAccount,
    pendingPayments: pendingCount ?? 0,
    recentLines: lines.slice(0, 3).map((l) => ({
      id: l.id,
      label: l.description,
      amount: l.amount,
      kind: l.kind,
    })),
  };
}

async function fetchAccountById(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  accountId: string
): Promise<SettlementAccount | null> {
  const { data: account } = await client
    .from("site_settlement_accounts")
    .select("bank_name, account_number, account_name")
    .eq("id", accountId)
    .maybeSingle();
  if (!account) return null;
  return {
    bankName: account.bank_name as string,
    accountNumber: account.account_number as string,
    accountName: account.account_name as string,
  };
}

async function resolveSettlementAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leaseId: string,
  unitId: string
): Promise<SettlementAccount | null> {
  const { data: unit } = await supabase
    .from("units")
    .select("site_id, settlement_account_id")
    .eq("id", unitId)
    .maybeSingle();

  // Unit assignment wins (matches the staff unit page). Lease is fallback for legacy rows.
  if (unit?.settlement_account_id) {
    const account = await fetchAccountById(supabase, unit.settlement_account_id);
    if (account) return account;
  }

  const { data: lease } = await supabase
    .from("leases")
    .select("settlement_account_id")
    .eq("id", leaseId)
    .maybeSingle();

  if (lease?.settlement_account_id) {
    const account = await fetchAccountById(supabase, lease.settlement_account_id);
    if (account) return account;
  }

  if (!unit?.site_id) return null;
  return defaultSettlementForSite(supabase, unit.site_id);
}

async function resolveSettlementAccountAdmin(
  admin: ReturnType<
    typeof import("@/lib/supabase/admin").createAdminClient
  >,
  leaseId: string,
  unitId: string
): Promise<SettlementAccount | null> {
  const { data: unit } = await admin
    .from("units")
    .select("site_id, settlement_account_id")
    .eq("id", unitId)
    .maybeSingle();

  if (unit?.settlement_account_id) {
    const account = await fetchAccountById(admin, unit.settlement_account_id);
    if (account) return account;
  }

  const { data: lease } = await admin
    .from("leases")
    .select("settlement_account_id")
    .eq("id", leaseId)
    .maybeSingle();

  if (lease?.settlement_account_id) {
    const account = await fetchAccountById(admin, lease.settlement_account_id);
    if (account) return account;
  }

  if (!unit?.site_id) return null;

  const { data: account } = await admin
    .from("site_settlement_accounts")
    .select("bank_name, account_number, account_name")
    .eq("site_id", unit.site_id)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (!account) return null;
  return {
    bankName: account.bank_name,
    accountNumber: account.account_number,
    accountName: account.account_name,
  };
}

async function resolveDvaAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  unitId: string
): Promise<SettlementAccount | null> {
  const { data: va } = await supabase
    .from("virtual_accounts")
    .select("account_number, bank_name, account_name")
    .eq("unit_id", unitId)
    .maybeSingle();

  if (!va) return null;
  return {
    bankName: va.bank_name,
    accountNumber: va.account_number,
    accountName: va.account_name,
    isDva: true,
  };
}

async function defaultSettlementForSite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siteId: string
): Promise<SettlementAccount | null> {
  const { data: account } = await supabase
    .from("site_settlement_accounts")
    .select("bank_name, account_number, account_name")
    .eq("site_id", siteId)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (!account) return null;
  return {
    bankName: account.bank_name,
    accountNumber: account.account_number,
    accountName: account.account_name,
  };
}
