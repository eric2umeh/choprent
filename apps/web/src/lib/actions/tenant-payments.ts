"use server";

import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/auth/session";
import { notifyPaymentSubmitted } from "@/lib/notifications/staff-notify";
import { metadataWithPaymentNote } from "@/lib/payments/payment-metadata";
import { uploadPaymentAttachments } from "@/lib/storage/payment-attachments";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const paymentNote = String(formData.get("payment_note") ?? "").trim() || null;
  const files = [
    ...formData.getAll("receipts"),
    formData.get("receipt"),
  ].filter((f): f is File => f instanceof File && f.size > 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount." };
  }

  if (files.length === 0) {
    return { error: "Upload at least one proof of payment." };
  }

  for (const file of files) {
    if (file.size > MAX_RECEIPT_BYTES) {
      return { error: `${file.name} must be 10MB or less.` };
    }
    if (!ALLOWED_RECEIPT_MIME.has(file.type)) {
      return { error: `${file.name}: use JPG, PNG, WebP, or PDF.` };
    }
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: lease } = await supabase
    .from("leases")
    .select("unit_id, id, tenant_display_name, units(unit_code)")
    .eq("tenant_user_id", ctx.user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!lease) return { error: "No active lease found for your account." };

  const ocrPayload = String(formData.get("ocr_payload") ?? "").trim();
  let metadata: Record<string, unknown> = {};
  if (ocrPayload) {
    try {
      metadata.ocr = JSON.parse(ocrPayload);
    } catch {
      metadata.ocr_note = "invalid_payload";
    }
  }

  metadata = metadataWithPaymentNote(metadata, paymentNote);

  const { data: payment, error: insertError } = await supabase
    .from("payments")
    .insert({
      organization_id: ctx.org.id,
      tenant_id: ctx.user.id,
      unit_id: lease.unit_id,
      amount_ngn: amount,
      period_label: periodLabel,
      bank_reference: bankReference,
      payment_method: "bank_transfer",
      status: "pending",
      payment_date: new Date().toISOString().slice(0, 10),
      recorded_by: ctx.user.id,
      metadata,
    })
    .select("id")
    .single();

  if (insertError || !payment) {
    return { error: insertError?.message ?? "Could not submit payment." };
  }

  const uploadResult = await uploadPaymentAttachments(
    payment.id,
    ctx.org.id,
    lease.unit_id,
    files,
    ctx.user.id
  );

  if (uploadResult.error) {
    await admin.from("payments").delete().eq("id", payment.id);
    return { error: uploadResult.error };
  }

  const firstPath = uploadResult.paths[0];
  if (firstPath) {
    const receiptUpdate: Record<string, unknown> = {
      receipt_file_url: firstPath,
    };
    if (!uploadResult.attachmentsInDb && uploadResult.paths.length > 0) {
      receiptUpdate.metadata = {
        ...metadata,
        attachment_paths: uploadResult.paths,
      };
    }
    await admin.from("payments").update(receiptUpdate).eq("id", payment.id);
  } else if (uploadResult.attachmentsInDb) {
    const { data: firstAttachment } = await admin
      .from("payment_attachments")
      .select("file_url")
      .eq("payment_id", payment.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstAttachment?.file_url) {
      await admin
        .from("payments")
        .update({ receipt_file_url: firstAttachment.file_url })
        .eq("id", payment.id);
    }
  }

  revalidatePath(`/t/${orgSlug}`);
  revalidatePath(`/t/${orgSlug}/pay`);
  revalidatePath(`/t/${orgSlug}/ledger`);
  revalidatePath(`/d/${orgSlug}/reports`);
  revalidatePath(`/d/${orgSlug}/payments`);
  revalidatePath(`/d/${orgSlug}`);

  const unitRaw = lease.units;
  const unitCode =
    unitRaw && typeof unitRaw === "object" && !Array.isArray(unitRaw) && "unit_code" in unitRaw
      ? String((unitRaw as { unit_code: string }).unit_code)
      : "Unit";

  await notifyPaymentSubmitted({
    orgId: ctx.org.id,
    unitCode,
    tenantName: lease.tenant_display_name,
    amount,
    paymentId: payment.id,
  });

  const { recordTenantEngagementInternal } = await import("@/lib/actions/tenant-activity-internal");
  await recordTenantEngagementInternal({
    orgId: ctx.org.id,
    tenantUserId: ctx.user.id,
    leaseId: lease.id,
    unitId: lease.unit_id,
    eventType: "receipt_uploaded",
    metadata: { amount: String(amount), files: String(files.length) },
  });

  return { success: true };
}
