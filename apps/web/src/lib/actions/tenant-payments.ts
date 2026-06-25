"use server";

import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type TenantPaymentActionState = {
  error?: string;
  success?: boolean;
};

const ALLOWED_RECEIPT_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export async function submitTransferPayment(
  orgSlug: string,
  _prev: TenantPaymentActionState,
  formData: FormData
): Promise<TenantPaymentActionState> {
  const ctx = await requireTenantContext(orgSlug);

  const amount = Number(formData.get("amount_ngn"));
  const bankReference = String(formData.get("bank_reference") ?? "").trim() || null;
  const periodLabel = String(formData.get("period_label") ?? "").trim() || null;
  const receipt = formData.get("receipt");

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount." };
  }

  if (!(receipt instanceof File) || receipt.size === 0) {
    return { error: "Upload your bank transfer receipt." };
  }
  if (receipt.size > MAX_RECEIPT_BYTES) {
    return { error: "Receipt must be 10MB or less." };
  }
  if (!ALLOWED_RECEIPT_MIME.has(receipt.type)) {
    return { error: "Use JPG, PNG, WebP, or PDF for the receipt." };
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

  const ext = receipt.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${ctx.org.id}/${lease.unit_id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(path, receipt, {
      upsert: false,
      contentType: receipt.type,
    });

  if (uploadError) {
    return { error: `Receipt upload failed: ${uploadError.message}` };
  }

  const ocrPayload = String(formData.get("ocr_payload") ?? "").trim();
  let metadata: Record<string, unknown> = {};
  if (ocrPayload) {
    try {
      metadata.ocr = JSON.parse(ocrPayload);
    } catch {
      metadata.ocr_note = "invalid_payload";
    }
  }

  const { error: insertError } = await supabase.from("payments").insert({
    organization_id: ctx.org.id,
    tenant_id: ctx.user.id,
    unit_id: lease.unit_id,
    amount_ngn: amount,
    period_label: periodLabel,
    bank_reference: bankReference,
    receipt_file_url: path,
    payment_method: "bank_transfer",
    status: "pending",
    payment_date: new Date().toISOString().slice(0, 10),
    metadata,
  });

  if (insertError) {
    await supabase.storage.from("receipts").remove([path]);
    return { error: insertError.message };
  }

  revalidatePath(`/t/${orgSlug}`);
  revalidatePath(`/t/${orgSlug}/pay`);
  revalidatePath(`/t/${orgSlug}/ledger`);
  revalidatePath(`/d/${orgSlug}/reports`);

  const { recordTenantEngagementInternal } = await import("@/lib/actions/tenant-activity-internal");
  await recordTenantEngagementInternal({
    orgId: ctx.org.id,
    tenantUserId: ctx.user.id,
    leaseId: lease.id,
    unitId: lease.unit_id,
    eventType: "receipt_uploaded",
    metadata: { amount: String(amount) },
  });

  return { success: true };
}
