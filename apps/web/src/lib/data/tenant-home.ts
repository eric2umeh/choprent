import { createClient } from "@/lib/supabase/server";
import { getTenantLedger } from "@/lib/data/ledger";

export type SettlementAccount = {
  bankName: string;
  accountNumber: string;
  accountName: string;
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

  const [{ count: pendingCount }, settlement] = await Promise.all([
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("unit_id", unitId)
      .eq("status", "pending"),
    resolveSettlementAccount(supabase, leaseId, unitId),
  ]);

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
    settlement,
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
