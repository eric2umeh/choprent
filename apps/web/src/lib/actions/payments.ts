"use server";

import { revalidatePath } from "next/cache";
import { canVerifyPayments } from "@/lib/auth/roles";
import { requireStaffContext } from "@/lib/auth/session";
import { isPrivilegedRole } from "@/lib/auth/roles";
import { runPaymentAllocation } from "@/lib/charges/allocate-payment";
import { getUnitBalanceBreakdown } from "@/lib/data/unit-balance-breakdown";
import {
  notifyPaymentSubmitted,
  notifyPaymentVerified,
} from "@/lib/notifications/staff-notify";
import { metadataWithPaymentNote } from "@/lib/payments/payment-metadata";
import { uploadPaymentAttachments } from "@/lib/storage/payment-attachments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PaymentActionState = {
  error?: string;
  success?: boolean;
};

export async function fetchUnitBalanceBreakdown(
  orgSlug: string,
  unitId: string
) {
  const ctx = await requireStaffContext(orgSlug);
  if (!unitId) return { rows: [], total: 0 };
  return getUnitBalanceBreakdown(ctx.org.id, unitId);
}

export async function verifyPayment(
  orgSlug: string,
  paymentId: string
): Promise<PaymentActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canVerifyPayments(ctx.role)) {
    return { error: "You don't have permission to verify payments." };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, status, organization_id, unit_id, amount_ngn, units(unit_code)")
    .eq("id", paymentId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!payment) return { error: "Payment not found." };
  if (payment.status !== "pending") {
    return { error: "Only pending payments can be verified." };
  }

  const { error: updateError } = await supabase
    .from("payments")
    .update({
      status: "verified",
      verified_by: ctx.user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  if (updateError) {
    const { error: adminUpdateError } = await admin
      .from("payments")
      .update({
        status: "verified",
        verified_by: ctx.user.id,
        verified_at: new Date().toISOString(),
      })
      .eq("id", paymentId);
    if (adminUpdateError) return { error: adminUpdateError.message };
  }

  try {
    await runPaymentAllocation(paymentId);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Verified but allocation failed.",
    };
  }

  const unitRaw = payment.units;
  const unitCode =
    unitRaw && typeof unitRaw === "object" && !Array.isArray(unitRaw) && "unit_code" in unitRaw
      ? String((unitRaw as { unit_code: string }).unit_code)
      : "Unit";

  await notifyPaymentVerified({
    orgId: ctx.org.id,
    unitCode,
    amount: Number(payment.amount_ngn),
    paymentId,
    verifiedByUserId: ctx.user.id,
    verifierRole: ctx.role,
  });

  revalidatePath(`/d/${orgSlug}/payments`);
  revalidatePath(`/d/${orgSlug}`);
  return { success: true };
}

export async function rejectPayment(
  orgSlug: string,
  paymentId: string,
  reason?: string
): Promise<PaymentActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canVerifyPayments(ctx.role)) {
    return { error: "You don't have permission to reject payments." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({
      status: "rejected",
      rejection_reason: reason?.trim() || "Rejected by verifier",
      verified_by: ctx.user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("organization_id", ctx.org.id);

  if (error) {
    const admin = createAdminClient();
    const { error: adminError } = await admin
      .from("payments")
      .update({
        status: "rejected",
        rejection_reason: reason?.trim() || "Rejected by verifier",
        verified_by: ctx.user.id,
        verified_at: new Date().toISOString(),
      })
      .eq("id", paymentId);
    if (adminError) return { error: adminError.message };
  }

  revalidatePath(`/d/${orgSlug}/payments`);
  return { success: true };
}

export async function recordCashPayment(
  orgSlug: string,
  _prev: PaymentActionState,
  formData: FormData
): Promise<PaymentActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canVerifyPayments(ctx.role)) {
    return { error: "You don't have permission to record cash." };
  }

  const unitId = String(formData.get("unit_id") ?? "");
  const amount = Number(formData.get("amount_ngn"));
  const periodLabel = String(formData.get("period_label") ?? "").trim() || null;
  const paymentDate = String(formData.get("payment_date") ?? "").trim() || null;
  const paymentNote = String(formData.get("payment_note") ?? "").trim() || null;
  const attachmentFiles = formData
    .getAll("attachments")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (!unitId || !Number.isFinite(amount) || amount <= 0) {
    return { error: "Unit and a valid amount are required." };
  }

  const admin = createAdminClient();
  const { data: unit } = await admin
    .from("units")
    .select("id, organization_id")
    .eq("id", unitId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!unit) return { error: "Unit not found in this plaza." };

  const { data: payment, error: insertError } = await admin
    .from("payments")
    .insert({
      organization_id: ctx.org.id,
      unit_id: unitId,
      amount_ngn: amount,
      period_label: periodLabel,
      payment_date: paymentDate,
      payment_method: "cash_recorded",
      status: "verified",
      verified_by: ctx.user.id,
      verified_at: new Date().toISOString(),
      metadata: metadataWithPaymentNote({}, paymentNote),
    })
    .select("id")
    .single();

  if (insertError || !payment) {
    return { error: insertError?.message ?? "Could not record payment." };
  }

  if (attachmentFiles.length > 0) {
    const uploadResult = await uploadPaymentAttachments(
      payment.id,
      ctx.org.id,
      unitId,
      attachmentFiles,
      ctx.user.id
    );
    if (uploadResult.error) return { error: uploadResult.error };

    const firstPath = uploadResult.paths[0];
    if (firstPath) {
      const update: Record<string, unknown> = { receipt_file_url: firstPath };
      if (!uploadResult.attachmentsInDb && uploadResult.paths.length > 0) {
        update.metadata = metadataWithPaymentNote(
          { attachment_paths: uploadResult.paths },
          paymentNote
        );
      }
      await admin.from("payments").update(update).eq("id", payment.id);
    } else if (uploadResult.attachmentsInDb) {
      const { data: attachments } = await admin
        .from("payment_attachments")
        .select("file_url")
        .eq("payment_id", payment.id)
        .limit(1);
      if (attachments?.[0]?.file_url) {
        await admin
          .from("payments")
          .update({ receipt_file_url: attachments[0].file_url })
          .eq("id", payment.id);
      }
    }
  }

  try {
    await runPaymentAllocation(payment.id);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Recorded but allocation failed.",
    };
  }

  revalidatePath(`/d/${orgSlug}/payments`);
  revalidatePath(`/d/${orgSlug}`);
  return { success: true };
}

export async function unverifyPayment(
  orgSlug: string,
  paymentId: string
): Promise<PaymentActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!isPrivilegedRole(ctx.role)) {
    return { error: "Only the landlord or an admin can unverify a payment." };
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, status, organization_id, payment_method")
    .eq("id", paymentId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!payment) return { error: "Payment not found." };
  if (payment.status !== "verified" && payment.status !== "auto_matched") {
    return { error: "Only verified payments can be unverified." };
  }
  if (payment.payment_method === "dedicated_account") {
    return { error: "DVA auto-matched payments cannot be unverified here." };
  }

  const { error: deallocError } = await admin.rpc("deallocate_payment", {
    p_payment_id: paymentId,
  });
  if (deallocError) return { error: deallocError.message };

  const { error: updateError } = await admin
    .from("payments")
    .update({
      status: "pending",
      verified_by: null,
      verified_at: null,
    })
    .eq("id", paymentId);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/d/${orgSlug}/payments`);
  revalidatePath(`/d/${orgSlug}`);
  return { success: true };
}

export async function updateCashPayment(
  orgSlug: string,
  _prev: PaymentActionState,
  formData: FormData
): Promise<PaymentActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canVerifyPayments(ctx.role)) {
    return { error: "You don't have permission to edit payments." };
  }

  const paymentId = String(formData.get("payment_id") ?? "");
  const amount = Number(formData.get("amount_ngn"));
  const periodLabel = String(formData.get("period_label") ?? "").trim() || null;
  const paymentDate = String(formData.get("payment_date") ?? "").trim() || null;

  if (!paymentId || !Number.isFinite(amount) || amount <= 0) {
    return { error: "A valid amount is required." };
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, status, payment_method, organization_id")
    .eq("id", paymentId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!payment) return { error: "Payment not found." };
  if (payment.payment_method !== "cash_recorded") {
    return { error: "Only cash-recorded payments can be edited." };
  }
  if (payment.status === "rejected") {
    return { error: "Rejected payments cannot be edited." };
  }

  const { error } = await admin
    .from("payments")
    .update({
      amount_ngn: amount,
      period_label: periodLabel,
      payment_date: paymentDate,
    })
    .eq("id", paymentId);

  if (error) return { error: error.message };

  if (payment.status === "verified" || payment.status === "auto_matched") {
    try {
      await runPaymentAllocation(paymentId);
    } catch (err) {
      return {
        error:
          err instanceof Error ? err.message : "Updated but allocation failed.",
      };
    }
  }

  revalidatePath(`/d/${orgSlug}/payments`);
  revalidatePath(`/d/${orgSlug}`);
  return { success: true };
}
