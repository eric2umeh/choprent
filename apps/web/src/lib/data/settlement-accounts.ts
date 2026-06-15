import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SettlementAccountItem = {
  id: string;
  siteId: string;
  propertyName: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  label: string;
  isDefault: boolean;
};

type Row = {
  id: string;
  site_id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  label: string;
  is_default: boolean;
  sites: { name: string; organization_id: string } | { name: string; organization_id: string }[] | null;
};

function siteName(sites: Row["sites"]): string {
  if (!sites) return "—";
  if (Array.isArray(sites)) return sites[0]?.name ?? "—";
  return sites.name;
}

export async function listSettlementAccounts(
  orgId: string
): Promise<SettlementAccountItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settlement_accounts")
    .select(
      "id, site_id, bank_name, account_number, account_name, label, is_default, sites!inner(name, organization_id)"
    )
    .eq("sites.organization_id", orgId)
    .order("is_default", { ascending: false });

  if (error || !data) {
    try {
      const admin = createAdminClient();
      const { data: rows } = await admin
        .from("site_settlement_accounts")
        .select(
          "id, site_id, bank_name, account_number, account_name, label, is_default, sites!inner(name, organization_id)"
        )
        .eq("sites.organization_id", orgId);
      return (rows as Row[] | null)?.map(mapRow) ?? [];
    } catch {
      return [];
    }
  }

  return (data as Row[]).map(mapRow);
}

function mapRow(row: Row): SettlementAccountItem {
  return {
    id: row.id,
    siteId: row.site_id,
    propertyName: siteName(row.sites),
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountName: row.account_name,
    label: row.label,
    isDefault: row.is_default,
  };
}
