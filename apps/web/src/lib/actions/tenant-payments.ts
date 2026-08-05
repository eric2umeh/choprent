"use server";

import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/auth/session";
import { notifyPaymentSubmitted } from "@/lib/notifications/staff-notify";
import { metadataWithPaymentNote } from "@/lib/payments/payment-metadata";
import { parseTenantPaymentMethod } from "@/lib/payments/methods";
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

  // Prefer lease from session context (admin-resolved). A second user-scoped
  // lease query can fail under nested RLS and falsely report "no active lease".
  const leaseId = ctx.leaseId;
  const unitId = ctx.unitId;
  if (!leaseId || !unitId) {
    return { error: "No active lease found for your account." };
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

  metadata = metadataWithPaymentNote(metadata, paymentNote);

  const paymentMethod = parseTenantPaymentMethod(formData.get("payment_method"));

  const paymentInsert = {
    organization_id: ctx.org.id,
    tenant_id: ctx.user.id,
    unit_id: unitId,
    amount_ngn: amount,
    period_label: periodLabel,
    bank_reference: bankReference,
    payment_method: paymentMethod,
    status: "pending" as const,
    payment_date: new Date().toISOString().slice(0, 10),
    recorded_by: ctx.user.id,
    metadata,
  };

  let payment: { id: string } | null = null;
  const { data: userPayment, error: insertError } = await supabase
    .from("payments")
    .insert(paymentInsert)
    .select("id")
    .single();

  if (userPayment) {
    payment = userPayment;
  } else {
    // Fall back to admin if tenant RLS insert fails despite an active lease.
    const { data: adminPayment, error: adminInsertError } = await admin
      .from("payments")
      .insert(paymentInsert)
      .select("id")
      .single();
    if (adminInsertError || !adminPayment) {
      return {
        error:
          insertError?.message ??
          adminInsertError?.message ??
          "Could not submit payment.",
      };
    }
    payment = adminPayment;
  }

  if (!payment) {
    return { error: insertError?.message ?? "Could not submit payment." };
  }

  const uploadResult = await uploadPaymentAttachments(
    payment.id,
    ctx.org.id,
    unitId,
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
  revalidatePath(`/t/${orgSlug}/documents`);
  revalidatePath(`/d/${orgSlug}/reports`);
  revalidatePath(`/d/${orgSlug}/payments`);
  revalidatePath(`/d/${orgSlug}`);

  await notifyPaymentSubmitted({
    orgId: ctx.org.id,
    unitCode: ctx.unitCode,
    tenantName: ctx.tenantDisplayName,
    amount,
    paymentId: payment.id,
  });

  const { recordTenantEngagementInternal } = await import("@/lib/actions/tenant-activity-internal");
  await recordTenantEngagementInternal({
    orgId: ctx.org.id,
    tenantUserId: ctx.user.id,
    leaseId,
    unitId,
    eventType: "receipt_uploaded",
    metadata: { amount: String(amount), files: String(files.length) },
  });

  return { success: true };
}
