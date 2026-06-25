"use server";

import { revalidatePath } from "next/cache";
import { requireStaffContext } from "@/lib/auth/session";
import { isPaystackDvaEnabled } from "@/lib/paystack/client";
import {
  listVirtualAccountsForOrg,
  provisionUnitDva,
} from "@/lib/paystack/provision-unit-dva";

export type VirtualAccountActionState = {
  error?: string;
  success?: boolean;
};

export async function listOrgVirtualAccounts(orgSlug: string) {
  if (!isPaystackDvaEnabled()) return [];
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") return [];
  return listVirtualAccountsForOrg(ctx.org.id);
}

export async function provisionUnitVirtualAccount(
  orgSlug: string,
  unitId: string
): Promise<VirtualAccountActionState> {
  if (!isPaystackDvaEnabled()) {
    return { error: "Paystack DVA is not enabled for this deployment." };
  }
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") {
    return { error: "Only the landlord can provision dedicated accounts." };
  }

  const result = await provisionUnitDva(ctx.org.id, unitId);
  if (result.error) return { error: result.error };

  revalidatePath(`/d/${orgSlug}/account`);
  revalidatePath(`/d/${orgSlug}/properties`);
  revalidatePath(`/t/${orgSlug}`);
  return { success: true };
}
