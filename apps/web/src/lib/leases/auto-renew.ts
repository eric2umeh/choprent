import type { createAdminClient } from "@/lib/supabase/admin";
import { regenerateLedgerForUnit } from "@/lib/charges/generate-ledger";
import { parseDate, toIsoDate } from "@/lib/charges/period-ranges";

type AdminClient = ReturnType<typeof createAdminClient>;

type RenewableLease = {
  id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  status: string;
  auto_renew?: boolean | null;
};

/**
 * If auto_renew is on and end_date has passed, roll end_date forward
 * one anniversary year at a time until it is in the future, then rebuild ledger.
 */
export async function ensureAutoRenewedLease(
  admin: AdminClient,
  orgId: string,
  lease: RenewableLease
): Promise<RenewableLease> {
  if (lease.status !== "active" || lease.auto_renew === false) {
    return lease;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let end = parseDate(lease.end_date);
  if (end >= today) return lease;

  // Roll forward by calendar years (anniversary of end date).
  let guard = 0;
  while (end < today && guard < 50) {
    end.setFullYear(end.getFullYear() + 1);
    guard += 1;
  }

  const newEnd = toIsoDate(end);
  const { error } = await admin
    .from("leases")
    .update({ end_date: newEnd })
    .eq("id", lease.id)
    .eq("status", "active");

  if (error) return lease;

  await regenerateLedgerForUnit(admin, orgId, lease.unit_id);

  return { ...lease, end_date: newEnd };
}
