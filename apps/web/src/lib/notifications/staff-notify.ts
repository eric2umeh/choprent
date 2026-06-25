import { createAdminClient } from "@/lib/supabase/admin";
import type { MembershipRole } from "@/types/database";

type NotifyInput = {
  orgId: string;
  title: string;
  body: string;
  roles: MembershipRole[];
  metadata?: Record<string, unknown>;
  excludeUserId?: string;
};

export async function notifyStaffMembers(input: NotifyInput): Promise<void> {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("memberships")
    .select("user_id, role")
    .eq("organization_id", input.orgId)
    .in("role", input.roles);

  const rows = (members ?? [])
    .filter((m) => m.user_id && m.user_id !== input.excludeUserId)
    .map((m) => ({
      user_id: m.user_id,
      organization_id: input.orgId,
      title: input.title,
      body: input.body,
      metadata: input.metadata ?? {},
    }));

  if (rows.length === 0) return;
  await admin.from("notifications").insert(rows);
}

export async function notifyPaymentSubmitted(input: {
  orgId: string;
  unitCode: string;
  tenantName: string;
  amount: number;
  paymentId: string;
}): Promise<void> {
  const amount = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(input.amount);

  await notifyStaffMembers({
    orgId: input.orgId,
    roles: ["owner", "manager", "agent"],
    title: `Receipt uploaded — Unit ${input.unitCode}`,
    body: `${input.tenantName} submitted ${amount} for verification.`,
    metadata: { type: "payment_pending", payment_id: input.paymentId },
  });
}

export async function notifyPaymentVerified(input: {
  orgId: string;
  unitCode: string;
  amount: number;
  paymentId: string;
  verifiedByUserId: string;
  verifierRole: MembershipRole;
}): Promise<void> {
  const amount = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(input.amount);

  if (input.verifierRole === "owner") return;

  await notifyStaffMembers({
    orgId: input.orgId,
    roles: ["owner"],
    title: `Payment verified — Unit ${input.unitCode}`,
    body: `${amount} was verified by your team.`,
    metadata: { type: "payment_verified", payment_id: input.paymentId },
    excludeUserId: input.verifiedByUserId,
  });
}
