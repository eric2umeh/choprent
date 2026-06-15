"use server";

import { revalidatePath } from "next/cache";
import { canVerifyPayments } from "@/lib/auth/roles";
import { requireStaffContext } from "@/lib/auth/session";
import { runPaymentAllocation } from "@/lib/charges/allocate-payment";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PaymentActionState = {
  error?: string;
  success?: boolean;
};

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
    .select("id, status, organization_id")
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
    })
    .select("id")
    .single();

  if (insertError || !payment) {
    return { error: insertError?.message ?? "Could not record payment." };
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
