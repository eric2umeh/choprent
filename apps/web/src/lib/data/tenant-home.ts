import { createClient } from "@/lib/supabase/server";
import { getTenantLedger } from "@/lib/data/ledger";
import { formatBillingPeriodLabel } from "@/lib/charges/period-ranges";
import { isPaystackDvaEnabled } from "@/lib/paystack/client";
import {
  deriveTenantPaymentStatus,
  type TenantPaymentStatus,
} from "@/lib/data/tenant-payment-status";

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
  /** Dedicated shop VA when enabled. */
  dva: SettlementAccount | null;
  /** Plaza / BEFS collection account for transfers. */
  befsAccount: SettlementAccount | null;
  /** Preferred pay-to account (DVA first, else BEFS). */
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
  const [{ count: pendingCount }, befsAccount, dva, periodInfo, leaseFinancials] =
    await Promise.all([
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("unit_id", unitId)
        .eq("status", "pending"),
      resolveSettlementAccount(supabase, leaseId, unitId),
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
      supabase
        .from("units")
        .select("arrears_balance_ngn")
        .eq("id", unitId)
        .maybeSingle(),
    ]);

  // Prefer settlement resolution via admin if RLS hid the account.
  let resolvedBefs = befsAccount;
  if (!resolvedBefs) {
    try {
      const admin = await adminFallback();
      resolvedBefs = await resolveSettlementAccountAdmin(admin, leaseId, unitId);
    } catch {
      /* keep null */
    }
  }

  const openPeriod = periodInfo.data;
  const periodLabel =
    openPeriod?.period_start && openPeriod?.period_end
      ? formatBillingPeriodLabel(openPeriod.period_start, openPeriod.period_end)
      : openPeriod?.period_start?.slice(0, 4) ?? null;

  const expected = Number(openPeriod?.expected_total_ngn ?? 0);
  const paid = Number(openPeriod?.paid_total_ngn ?? 0);
  const arrears = Number(leaseFinancials.data?.arrears_balance_ngn ?? 0);
  const rentStatus = deriveTenantPaymentStatus(expected, paid, arrears);

  const payAccount = dva ?? resolvedBefs;

  return {
    balance,
    periodLabel,
    rentStatus,
    dva,
    befsAccount: resolvedBefs,
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

async function resolveSettlementAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leaseId: string,
  unitId: string
): Promise<SettlementAccount | null> {
  const { data: lease } = await supabase
    .from("leases")
    .select("settlement_account_id, units!inner(site_id)")
    .eq("id", leaseId)
    .maybeSingle();

  const siteId =
    lease?.units &&
    typeof lease.units === "object" &&
    !Array.isArray(lease.units) &&
    "site_id" in lease.units
      ? (lease.units as { site_id: string }).site_id
      : null;

  if (lease?.settlement_account_id) {
    const { data: account } = await supabase
      .from("site_settlement_accounts")
      .select("bank_name, account_number, account_name")
      .eq("id", lease.settlement_account_id)
      .maybeSingle();
    if (account) {
      return {
        bankName: account.bank_name,
        accountNumber: account.account_number,
        accountName: account.account_name,
      };
    }
  }

  if (!siteId) {
    const { data: unit } = await supabase
      .from("units")
      .select("site_id")
      .eq("id", unitId)
      .maybeSingle();
    if (!unit?.site_id) return null;
    return defaultSettlementForSite(supabase, unit.site_id);
  }

  return defaultSettlementForSite(supabase, siteId);
}

async function resolveSettlementAccountAdmin(
  admin: ReturnType<
    typeof import("@/lib/supabase/admin").createAdminClient
  >,
  leaseId: string,
  unitId: string
): Promise<SettlementAccount | null> {
  const { data: lease } = await admin
    .from("leases")
    .select("settlement_account_id, units!inner(site_id)")
    .eq("id", leaseId)
    .maybeSingle();

  const siteId =
    lease?.units &&
    typeof lease.units === "object" &&
    !Array.isArray(lease.units) &&
    "site_id" in lease.units
      ? (lease.units as { site_id: string }).site_id
      : null;

  if (lease?.settlement_account_id) {
    const { data: account } = await admin
      .from("site_settlement_accounts")
      .select("bank_name, account_number, account_name")
      .eq("id", lease.settlement_account_id)
      .maybeSingle();
    if (account) {
      return {
        bankName: account.bank_name,
        accountNumber: account.account_number,
        accountName: account.account_name,
      };
    }
  }

  const resolvedSiteId =
    siteId ??
    (
      await admin.from("units").select("site_id").eq("id", unitId).maybeSingle()
    ).data?.site_id ??
    null;

  if (!resolvedSiteId) return null;

  const { data: account } = await admin
    .from("site_settlement_accounts")
    .select("bank_name, account_number, account_name")
    .eq("site_id", resolvedSiteId)
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
