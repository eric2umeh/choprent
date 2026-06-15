"use server";

import { revalidatePath } from "next/cache";
import { canManageLeases } from "@/lib/auth/roles";
import { requireStaffContext } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BillingCadence } from "@/types/database";

export type LeaseActionState = {
  error?: string;
  success?: boolean;
};

export async function createLease(
  orgSlug: string,
  _prev: LeaseActionState,
  formData: FormData
): Promise<LeaseActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageLeases(ctx.role)) {
    return { error: "You don't have permission to manage leases." };
  }

  const unitId = String(formData.get("unit_id") ?? "").trim();
  const tenantName = String(formData.get("tenant_display_name") ?? "").trim();
  const tenantPhone = String(formData.get("tenant_phone") ?? "").trim() || null;
  const tenantEmail = String(formData.get("tenant_email") ?? "").trim() || null;
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const billingCadence = String(formData.get("billing_cadence") ?? "annual") as BillingCadence;

  if (!unitId || !tenantName || !startDate || !endDate) {
    return { error: "Unit, tenant name, and lease dates are required." };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: unit } = await supabase
    .from("units")
    .select("id, organization_id, status")
    .eq("id", unitId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!unit) return { error: "Unit not found." };

  const { data: existingLease } = await supabase
    .from("leases")
    .select("id")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .maybeSingle();

  if (existingLease) {
    return { error: "This unit already has an active lease. Renew instead." };
  }

  let tenantUserId: string | null = null;
  if (tenantEmail) {
    const { data: usersPage } = await admin.auth.admin.listUsers();
    tenantUserId =
      usersPage.users.find(
        (u) => u.email?.toLowerCase() === tenantEmail.toLowerCase()
      )?.id ?? null;
  }

  const { error: insertError } = await supabase.from("leases").insert({
    unit_id: unitId,
    tenant_user_id: tenantUserId,
    tenant_display_name: tenantName,
    tenant_phone: tenantPhone,
    tenant_email: tenantEmail,
    start_date: startDate,
    end_date: endDate,
    billing_cadence: billingCadence,
    status: "active",
  });

  if (insertError) return { error: insertError.message };

  await supabase
    .from("units")
    .update({ status: "occupied" })
    .eq("id", unitId);

  revalidatePath(`/d/${orgSlug}/tenants`);
  revalidatePath(`/d/${orgSlug}/properties`);
  return { success: true };
}

export async function renewLease(
  orgSlug: string,
  leaseId: string,
  _prev: LeaseActionState,
  formData: FormData
): Promise<LeaseActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageLeases(ctx.role)) {
    return { error: "You don't have permission to manage leases." };
  }

  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const billingCadence = String(formData.get("billing_cadence") ?? "annual") as BillingCadence;

  if (!startDate || !endDate) {
    return { error: "New lease dates are required." };
  }

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("leases")
    .select(
      "id, unit_id, tenant_user_id, tenant_display_name, tenant_phone, tenant_email, settlement_account_id, units!inner(organization_id)"
    )
    .eq("id", leaseId)
    .eq("status", "active")
    .maybeSingle();

  if (!current) return { error: "Active lease not found." };

  const orgId =
    current.units &&
    typeof current.units === "object" &&
    !Array.isArray(current.units) &&
    "organization_id" in current.units
      ? (current.units as { organization_id: string }).organization_id
      : null;

  if (orgId !== ctx.org.id) return { error: "Lease not found." };

  const { error: endError } = await supabase
    .from("leases")
    .update({ status: "ended" })
    .eq("id", leaseId);

  if (endError) return { error: endError.message };

  const { error: insertError } = await supabase.from("leases").insert({
    unit_id: current.unit_id,
    tenant_user_id: current.tenant_user_id,
    tenant_display_name: current.tenant_display_name,
    tenant_phone: current.tenant_phone,
    tenant_email: current.tenant_email,
    settlement_account_id: current.settlement_account_id,
    start_date: startDate,
    end_date: endDate,
    billing_cadence: billingCadence,
    status: "active",
    renewed_from_lease_id: leaseId,
  });

  if (insertError) return { error: insertError.message };

  revalidatePath(`/d/${orgSlug}/tenants`);
  return { success: true };
}
