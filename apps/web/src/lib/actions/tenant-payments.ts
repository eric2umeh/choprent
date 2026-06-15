"use server";

import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type TenantPaymentActionState = {
  error?: string;
  success?: boolean;
};

export async function submitTransferPayment(
  orgSlug: string,
  _prev: TenantPaymentActionState,
  formData: FormData
): Promise<TenantPaymentActionState> {
  const ctx = await requireTenantContext(orgSlug);
  if (ctx.demoMode) {
    return { error: "Demo mode — sign in with a real tenant lease to submit." };
  }

  const amount = Number(formData.get("amount_ngn"));
  const bankReference = String(formData.get("bank_reference") ?? "").trim() || null;
  const periodLabel = String(formData.get("period_label") ?? "").trim() || null;
  const receipt = formData.get("receipt");

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount." };
  }

  const supabase = await createClient();

  const { data: lease } = await supabase
    .from("leases")
    .select("unit_id, id")
    .eq("tenant_user_id", ctx.user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!lease) return { error: "No active lease found for your account." };

  let receiptPath: string | null = null;

  if (receipt instanceof File && receipt.size > 0) {
    const ext = receipt.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${ctx.org.id}/${lease.unit_id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(path, receipt, { upsert: false });

    if (uploadError) {
      return { error: `Receipt upload failed: ${uploadError.message}` };
    }
    receiptPath = path;
  }

  const { error: insertError } = await supabase.from("payments").insert({
    organization_id: ctx.org.id,
    tenant_id: ctx.user.id,
    unit_id: lease.unit_id,
    amount_ngn: amount,
    period_label: periodLabel,
    bank_reference: bankReference,
    receipt_file_url: receiptPath,
    payment_method: "bank_transfer",
    status: "pending",
    payment_date: new Date().toISOString().slice(0, 10),
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath(`/t/${orgSlug}/pay`);
  revalidatePath(`/t/${orgSlug}/ledger`);
  return { success: true };
}
