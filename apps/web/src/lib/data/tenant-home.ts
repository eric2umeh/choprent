import { createClient } from "@/lib/supabase/server";
import { getTenantLedger } from "@/lib/data/ledger";
import { isPaystackDvaEnabled } from "@/lib/paystack/client";

export type SettlementAccount = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDva?: boolean;
};

export type TenantHomeSummary = {
  balance: number;
  periodLabel: string | null;
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

  const dvaEnabled = isPaystackDvaEnabled();
  const [{ count: pendingCount }, settlement, dva] = await Promise.all([
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("unit_id", unitId)
      .eq("status", "pending"),
    resolveSettlementAccount(supabase, leaseId, unitId),
    dvaEnabled ? resolveDvaAccount(supabase, unitId) : Promise.resolve(null),
  ]);

  const payAccount = dva ?? settlement;

  const { data: openPeriod } = await supabase
    .from("ledger_periods")
    .select("period_label, period_start")
    .eq("unit_id", unitId)
    .eq("status", "open")
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    balance,
    periodLabel: openPeriod?.period_label ?? openPeriod?.period_start?.slice(0, 4) ?? null,
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
