"use server";

import { revalidatePath } from "next/cache";
import { requireStaffContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type SettlementActionState = {
  error?: string;
  success?: boolean;
};

export async function saveSettlementAccount(
  orgSlug: string,
  _prev: SettlementActionState,
  formData: FormData
): Promise<SettlementActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") {
    return { error: "Only the landlord can manage settlement accounts." };
  }

  const accountId = String(formData.get("account_id") ?? "").trim() || null;
  const siteId = String(formData.get("site_id") ?? "").trim();
  const bankName = String(formData.get("bank_name") ?? "").trim();
  const accountNumber = String(formData.get("account_number") ?? "").trim();
  const accountName = String(formData.get("account_name") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || "Main rent";
  const isDefault = formData.get("is_default") === "on";

  if (!siteId || !bankName || !accountNumber || !accountName) {
    return { error: "Property, bank, account number, and account name are required." };
  }

  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!site) return { error: "Property not found." };

  if (isDefault) {
    await supabase
      .from("site_settlement_accounts")
      .update({ is_default: false })
      .eq("site_id", siteId);
  }

  if (accountId) {
    const { error } = await supabase
      .from("site_settlement_accounts")
      .update({
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        label,
        is_default: isDefault,
      })
      .eq("id", accountId);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("site_settlement_accounts").insert({
      site_id: siteId,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      label,
      is_default: isDefault,
    });

    if (error) return { error: error.message };
  }

  revalidatePath(`/d/${orgSlug}/account`);
  return { success: true };
}
