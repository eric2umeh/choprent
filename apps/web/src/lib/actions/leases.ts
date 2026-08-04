"use server";

import { revalidatePath } from "next/cache";
import { canManageLeases } from "@/lib/auth/roles";
import { requireStaffContext } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { regenerateLedgerForUnit } from "@/lib/charges/generate-ledger";
import { uploadDocumentsFromFormData } from "@/lib/documents/upload";
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
  const settlementAccountId =
    String(formData.get("settlement_account_id") ?? "").trim() || null;
  // Checkbox "fixed_end_date" means manual renewal (auto_renew = false).
  const autoRenew = formData.get("fixed_end_date") !== "on";

  if (!unitId || !tenantName || !startDate || !endDate) {
    return { error: "Unit, tenant name, and lease dates are required." };
  }

  const admin = createAdminClient();

  const { data: unit } = await admin
    .from("units")
    .select("id, organization_id, status, site_id")
    .eq("id", unitId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!unit) return { error: "Unit not found in this organization." };

  const { data: existingLease } = await admin
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

  if (settlementAccountId) {
    const { data: account } = await admin
      .from("site_settlement_accounts")
      .select("id, site_id")
      .eq("id", settlementAccountId)
      .maybeSingle();

    if (!account || account.site_id !== unit.site_id) {
      return { error: "Settlement account must belong to this unit's property." };
    }
  }

  // Prefer form selection; else unit assignment; else leave null (property default at resolve).
  let resolvedSettlementId = settlementAccountId;
  if (!resolvedSettlementId) {
    const { data: unitRow } = await admin
      .from("units")
      .select("settlement_account_id")
      .eq("id", unitId)
      .maybeSingle();
    resolvedSettlementId = unitRow?.settlement_account_id ?? null;
  }

  const { data: newLease, error: insertError } = await admin.from("leases").insert({
    unit_id: unitId,
    tenant_user_id: tenantUserId,
    tenant_display_name: tenantName,
    tenant_phone: tenantPhone,
    tenant_email: tenantEmail,
    settlement_account_id: resolvedSettlementId,
    start_date: startDate,
    end_date: endDate,
    billing_cadence: billingCadence,
    auto_renew: autoRenew,
    status: "active",
    created_by: ctx.user.id,
  }).select("id").single();

  if (insertError || !newLease) return { error: insertError?.message ?? "Could not create lease." };

  await admin.from("units").update({ status: "occupied" }).eq("id", unitId);

  await regenerateLedgerForUnit(admin, ctx.org.id, unitId);

  const docResult = await uploadDocumentsFromFormData(
    admin,
    ctx.org.id,
    ctx.user.id,
    formData,
    {
      unitId,
      leaseId: newLease.id,
      siteId: unit.site_id,
    }
  );
  if (docResult.error) {
    return { error: `Lease created but documents failed: ${docResult.error}` };
  }

  const { syncDvaAccountNameForUnit } = await import("@/lib/paystack/provision-unit-dva");
  const { isPaystackDvaEnabled } = await import("@/lib/paystack/client");
  if (isPaystackDvaEnabled()) {
    await syncDvaAccountNameForUnit(unitId);
  }

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
  const autoRenew = formData.get("fixed_end_date") !== "on";
  const settlementAccountIdRaw = String(
    formData.get("settlement_account_id") ?? ""
  ).trim();
  const settlementAccountProvided = formData.has("settlement_account_id");
  const settlementAccountId = settlementAccountIdRaw || null;

  if (!startDate || !endDate) {
    return { error: "New lease dates are required." };
  }

  const admin = createAdminClient();

  const { data: current } = await admin
    .from("leases")
    .select(
      "id, unit_id, tenant_user_id, tenant_display_name, tenant_phone, tenant_email, settlement_account_id, units!inner(organization_id, site_id)"
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

  const siteId =
    current.units &&
    typeof current.units === "object" &&
    !Array.isArray(current.units) &&
    "site_id" in current.units
      ? (current.units as { site_id: string }).site_id
      : null;

  let nextSettlementId = current.settlement_account_id;
  if (settlementAccountProvided) {
    if (settlementAccountId && siteId) {
      const { data: account } = await admin
        .from("site_settlement_accounts")
        .select("id, site_id")
        .eq("id", settlementAccountId)
        .maybeSingle();
      if (!account || account.site_id !== siteId) {
        return { error: "Settlement account must belong to this unit's property." };
      }
    }
    nextSettlementId = settlementAccountId;
  }

  const { error: endError } = await admin
    .from("leases")
    .update({ status: "ended" })
    .eq("id", leaseId);

  if (endError) return { error: endError.message };

  const { data: newLease, error: insertError } = await admin.from("leases").insert({
    unit_id: current.unit_id,
    tenant_user_id: current.tenant_user_id,
    tenant_display_name: current.tenant_display_name,
    tenant_phone: current.tenant_phone,
    tenant_email: current.tenant_email,
    settlement_account_id: nextSettlementId,
    start_date: startDate,
    end_date: endDate,
    billing_cadence: billingCadence,
    auto_renew: autoRenew,
    status: "active",
    renewed_from_lease_id: leaseId,
    created_by: ctx.user.id,
  }).select("id").single();

  if (insertError || !newLease) return { error: insertError?.message ?? "Could not renew lease." };

  await regenerateLedgerForUnit(admin, ctx.org.id, current.unit_id);

  const { syncDvaAccountNameForUnit } = await import("@/lib/paystack/provision-unit-dva");
  const { isPaystackDvaEnabled } = await import("@/lib/paystack/client");
  if (isPaystackDvaEnabled()) {
    await syncDvaAccountNameForUnit(current.unit_id);
  }

  revalidatePath(`/d/${orgSlug}/tenants`);
  revalidatePath(`/t/${orgSlug}`);
  revalidatePath(`/t/${orgSlug}/pay`);
  return { success: true };
}

export async function updateActiveLease(
  orgSlug: string,
  leaseId: string,
  _prev: LeaseActionState,
  formData: FormData
): Promise<LeaseActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageLeases(ctx.role)) {
    return { error: "You don't have permission to manage leases." };
  }

  const tenantName = String(formData.get("tenant_display_name") ?? "").trim();
  const tenantPhone = String(formData.get("tenant_phone") ?? "").trim() || null;
  const tenantEmail = String(formData.get("tenant_email") ?? "").trim() || null;
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const billingCadence = String(formData.get("billing_cadence") ?? "annual") as BillingCadence;
  const autoRenew = formData.get("fixed_end_date") !== "on";
  const settlementAccountIdRaw = String(
    formData.get("settlement_account_id") ?? ""
  ).trim();
  const settlementAccountProvided = formData.has("settlement_account_id");
  const settlementAccountId = settlementAccountIdRaw || null;

  if (!tenantName || !startDate || !endDate) {
    return { error: "Tenant name and lease dates are required." };
  }

  const admin = createAdminClient();

  const { data: current } = await admin
    .from("leases")
    .select(
      "id, unit_id, units!inner(organization_id, site_id)"
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

  const siteId =
    current.units &&
    typeof current.units === "object" &&
    !Array.isArray(current.units) &&
    "site_id" in current.units
      ? (current.units as { site_id: string }).site_id
      : null;

  let tenantUserId: string | null = null;
  if (tenantEmail) {
    const { data: usersPage } = await admin.auth.admin.listUsers();
    tenantUserId =
      usersPage.users.find(
        (u) => u.email?.toLowerCase() === tenantEmail.toLowerCase()
      )?.id ?? null;
  }

  if (settlementAccountProvided && settlementAccountId && siteId) {
    const { data: account } = await admin
      .from("site_settlement_accounts")
      .select("id, site_id")
      .eq("id", settlementAccountId)
      .maybeSingle();
    if (!account || account.site_id !== siteId) {
      return { error: "Settlement account must belong to this unit's property." };
    }
  }

  const updatePayload: Record<string, string | boolean | null> = {
    tenant_display_name: tenantName,
    tenant_phone: tenantPhone,
    tenant_email: tenantEmail,
    start_date: startDate,
    end_date: endDate,
    billing_cadence: billingCadence,
    auto_renew: autoRenew,
  };
  if (tenantUserId) updatePayload.tenant_user_id = tenantUserId;
  if (settlementAccountProvided) {
    updatePayload.settlement_account_id = settlementAccountId;
  }

  const { error: updateError } = await admin
    .from("leases")
    .update(updatePayload)
    .eq("id", leaseId);

  if (updateError) return { error: updateError.message };

  // Mirror lease collection account onto the unit so both admin views stay aligned.
  if (settlementAccountProvided) {
    await admin
      .from("units")
      .update({ settlement_account_id: settlementAccountId })
      .eq("id", current.unit_id);
  }

  await regenerateLedgerForUnit(admin, ctx.org.id, current.unit_id);

  const docResult = await uploadDocumentsFromFormData(
    admin,
    ctx.org.id,
    ctx.user.id,
    formData,
    {
      unitId: current.unit_id,
      leaseId,
      siteId: siteId ?? null,
    }
  );
  if (docResult.error) {
    return { error: `Lease updated but documents failed: ${docResult.error}` };
  }

  revalidatePath(`/d/${orgSlug}/tenants`);
  revalidatePath(`/d/${orgSlug}/tenants/${leaseId}`);
  revalidatePath(`/d/${orgSlug}/properties`);
  revalidatePath(`/t/${orgSlug}`);
  revalidatePath(`/t/${orgSlug}/pay`);
  return { success: true };
}

export async function endActiveLease(
  orgSlug: string,
  leaseId: string,
  endDate?: string
): Promise<LeaseActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageLeases(ctx.role)) {
    return { error: "You don't have permission to manage leases." };
  }

  const admin = createAdminClient();

  const { data: lease } = await admin
    .from("leases")
    .select("id, unit_id, start_date, end_date, units!inner(organization_id)")
    .eq("id", leaseId)
    .eq("status", "active")
    .maybeSingle();

  if (!lease) return { error: "Active lease not found." };

  const orgId =
    lease.units &&
    typeof lease.units === "object" &&
    !Array.isArray(lease.units) &&
    "organization_id" in lease.units
      ? (lease.units as { organization_id: string }).organization_id
      : null;

  if (orgId !== ctx.org.id) return { error: "Lease not found." };

  const resolvedEnd =
    endDate?.trim() ||
    new Date().toISOString().slice(0, 10);

  if (resolvedEnd < lease.start_date) {
    return { error: "End date cannot be before the tenancy start date." };
  }

  const { error: endError } = await admin
    .from("leases")
    .update({
      status: "ended",
      end_date: resolvedEnd,
      auto_renew: false,
    })
    .eq("id", leaseId);

  if (endError) return { error: endError.message };

  const { error: unitError } = await admin
    .from("units")
    .update({ status: "vacant" })
    .eq("id", lease.unit_id);

  if (unitError) return { error: unitError.message };

  revalidatePath(`/d/${orgSlug}/tenants`);
  revalidatePath(`/d/${orgSlug}/tenants/former`);
  revalidatePath(`/d/${orgSlug}/tenants/${leaseId}`);
  revalidatePath(`/d/${orgSlug}/properties`);
  return { success: true };
}
