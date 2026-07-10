"use server";

import { revalidatePath } from "next/cache";
import { requireStaffContext } from "@/lib/auth/session";
import { isPrivilegedRole } from "@/lib/auth/roles";
import { getPropertyForOrg } from "@/lib/data/sites";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SettlementActionState = {
  error?: string;
  success?: boolean;
};

async function clearDefaultForSite(siteId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settlement_accounts")
    .update({ is_default: false })
    .eq("site_id", siteId);

  if (error) {
    const admin = createAdminClient();
    await admin
      .from("site_settlement_accounts")
      .update({ is_default: false })
      .eq("site_id", siteId);
  }
}

export async function saveSettlementAccount(
  orgSlug: string,
  _prev: SettlementActionState,
  formData: FormData
): Promise<SettlementActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!isPrivilegedRole(ctx.role)) {
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

  const property = await getPropertyForOrg(ctx.org.id, siteId);
  if (!property) return { error: "Property not found." };

  if (isDefault) {
    await clearDefaultForSite(siteId);
  }

  const payload = {
    bank_name: bankName,
    account_number: accountNumber,
    account_name: accountName,
    label,
    is_default: isDefault,
  };

  const supabase = await createClient();

  if (accountId) {
    let result = await supabase
      .from("site_settlement_accounts")
      .update(payload)
      .eq("id", accountId)
      .eq("site_id", siteId);

    if (result.error) {
      const admin = createAdminClient();
      result = await admin
        .from("site_settlement_accounts")
        .update(payload)
        .eq("id", accountId)
        .eq("site_id", siteId);
    }

    if (result.error) return { error: result.error.message };
  } else {
    let result = await supabase.from("site_settlement_accounts").insert({
      site_id: siteId,
      ...payload,
    });

    if (result.error) {
      const admin = createAdminClient();
      result = await admin.from("site_settlement_accounts").insert({
        site_id: siteId,
        ...payload,
      });
    }

    if (result.error) return { error: result.error.message };
  }

  revalidatePath(`/d/${orgSlug}/account`);
  revalidatePath(`/d/${orgSlug}/tenants`);
  return { success: true };
}

export async function deleteSettlementAccount(
  orgSlug: string,
  accountId: string
): Promise<SettlementActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!isPrivilegedRole(ctx.role)) {
    return { error: "Only the landlord can manage settlement accounts." };
  }

  const supabase = await createClient();
  let result = await supabase
    .from("site_settlement_accounts")
    .delete()
    .eq("id", accountId);

  if (result.error) {
    const admin = createAdminClient();
    result = await admin.from("site_settlement_accounts").delete().eq("id", accountId);
  }

  if (result.error) return { error: result.error.message };

  revalidatePath(`/d/${orgSlug}/account`);
  revalidatePath(`/d/${orgSlug}/tenants`);
  return { success: true };
}
