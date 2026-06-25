import { createAdminClient } from "@/lib/supabase/admin";
import { runPaymentAllocation } from "@/lib/charges/allocate-payment";
import { recordTenantEngagementInternal } from "@/lib/actions/tenant-activity-internal";
import {
  isPaystackConfigured,
  isPaystackDvaEnabled,
  verifyPaystackSignature,
} from "@/lib/paystack/client";
import { NextResponse } from "next/server";

type PaystackWebhookEvent = {
  event: string;
  data: {
    reference: string;
    amount: number;
    customer?: { customer_code?: string };
    metadata?: { unit_id?: string; organization_id?: string };
    authorization?: { account_number?: string };
  };
};

export async function POST(request: Request) {
  if (!isPaystackDvaEnabled()) {
    return NextResponse.json({ error: "Paystack DVA disabled" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (isPaystackConfigured() && !verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  const reference = event.data.reference;
  const amountNgn = event.data.amount / 100;

  const { data: existing } = await admin
    .from("payments")
    .select("id")
    .eq("metadata->>paystack_reference", reference)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  let unitId = event.data.metadata?.unit_id ?? null;
  let orgId = event.data.metadata?.organization_id ?? null;
  let tenantUserId: string | null = null;
  let leaseId: string | null = null;

  if (!unitId && event.data.customer?.customer_code) {
    const { data: va } = await admin
      .from("virtual_accounts")
      .select("unit_id, active_lease_id, units!inner(organization_id)")
      .eq("paystack_customer_code", event.data.customer.customer_code)
      .maybeSingle();

    if (va) {
      unitId = va.unit_id;
      leaseId = va.active_lease_id;
      const units = va.units as { organization_id: string } | { organization_id: string }[];
      orgId = Array.isArray(units) ? units[0]?.organization_id : units.organization_id;
    }
  }

  if (!unitId || !orgId) {
    return NextResponse.json({ error: "Could not match unit" }, { status: 422 });
  }

  if (leaseId) {
    const { data: lease } = await admin
      .from("leases")
      .select("id, tenant_user_id")
      .eq("id", leaseId)
      .maybeSingle();
    tenantUserId = lease?.tenant_user_id ?? null;
    leaseId = lease?.id ?? null;
  } else {
    const { data: lease } = await admin
      .from("leases")
      .select("id, tenant_user_id")
      .eq("unit_id", unitId)
      .eq("status", "active")
      .maybeSingle();
    tenantUserId = lease?.tenant_user_id ?? null;
    leaseId = lease?.id ?? null;
  }

  const { data: org } = await admin
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .maybeSingle();

  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  const paymentsSettings = (settings.payments ?? {}) as Record<string, unknown>;
  const autoVerify = paymentsSettings.auto_verify_dva !== false;

  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      organization_id: orgId,
      tenant_id: tenantUserId,
      unit_id: unitId,
      amount_ngn: amountNgn,
      payment_method: "dedicated_account",
      status: autoVerify ? "auto_matched" : "pending",
      payment_date: new Date().toISOString().slice(0, 10),
      bank_reference: reference,
      metadata: { paystack_reference: reference },
      verified_at: autoVerify ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  if (autoVerify) {
    try {
      await runPaymentAllocation(payment.id);
    } catch {
      /* allocation can be retried manually */
    }
  }

  if (tenantUserId) {
    await recordTenantEngagementInternal({
      orgId,
      tenantUserId,
      leaseId,
      unitId,
      eventType: "dva_payment_received",
      metadata: { amount: String(amountNgn), reference },
    });
  }

  return NextResponse.json({ received: true, paymentId: payment.id });
}
