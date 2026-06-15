import { createAdminClient } from "@/lib/supabase/admin";

/** Run Postgres allocation — oldest arrears first, then open ledger periods. */
export async function runPaymentAllocation(paymentId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("allocate_payment", {
    p_payment_id: paymentId,
  });
  if (error) throw new Error(error.message);
}
