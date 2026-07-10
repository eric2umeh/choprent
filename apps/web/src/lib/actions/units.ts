"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canAddUnits, canEditUnits } from "@/lib/auth/roles";
import { requireStaffContext } from "@/lib/auth/session";
import { getPropertyForOrg } from "@/lib/data/sites";
import { unitPath, propertyPath } from "@/lib/routes/dashboard-paths";
import { revalidatePropertyDashboardPaths } from "@/lib/routes/revalidate-dashboard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseBillingProfileFromForm,
} from "@/lib/charges/billing-profile";
import { regenerateLedgerForUnit } from "@/lib/charges/generate-ledger";
import type { BillingCadence, PropertyType } from "@/types/database";

export type UnitActionState = {
  error?: string;
  success?: boolean;
  unitId?: string;
};

function isCompositeCode(code: string): boolean {
  return /[/&]/.test(code);
}

function currentYearRange() {
  const year = new Date().getFullYear();
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export async function createUnit(
  orgSlug: string,
  _prev: UnitActionState,
  formData: FormData
): Promise<UnitActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canAddUnits(ctx.role)) {
    return { error: "Only the landlord or an admin can add units." };
  }

  const siteId = String(formData.get("site_id") ?? "").trim();
  const unitCode = String(formData.get("unit_code") ?? "").trim();
  const propertyType = String(formData.get("property_type") ?? "shop") as PropertyType;
  const compositeNote = String(formData.get("composite_note") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "vacant") as
    | "vacant"
    | "occupied"
    | "maintenance";

  if (!siteId) return { error: "Property is required." };
  if (!unitCode) return { error: "Unit code is required." };

  const property = await getPropertyForOrg(ctx.org.id, siteId);
  if (!property) return { error: "Property not found. Refresh and try again." };

  const payload = {
    organization_id: ctx.org.id,
    site_id: siteId,
    unit_code: unitCode,
    unit_code_normalized: unitCode.toLowerCase().replace(/\s+/g, ""),
    is_composite: isCompositeCode(unitCode),
    composite_note: compositeNote,
    property_type: propertyType,
    status,
  };

  const admin = createAdminClient();
  const { data, error } = await admin.from("units").insert(payload).select("id").single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A unit with this code already exists in that property." };
    }
    return { error: error.message };
  }

  revalidatePropertyDashboardPaths(orgSlug, ctx.org.id, siteId);
  revalidatePath(`/d/${orgSlug}/properties`);

  if (formData.get("stay_on_page") === "1") {
    return { success: true, unitId: data.id };
  }

  redirect(unitPath(orgSlug, property.slug, unitCode));
}

export async function setupUnitDetails(
  orgSlug: string,
  unitId: string,
  _prev: UnitActionState,
  formData: FormData
): Promise<UnitActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canEditUnits(ctx.role)) {
    return { error: "You don't have permission to edit units." };
  }

  const unitCode = String(formData.get("unit_code") ?? "").trim();
  const propertyType = String(formData.get("property_type") ?? "shop") as PropertyType;
  const status = String(formData.get("status") ?? "vacant") as
    | "vacant"
    | "occupied"
    | "maintenance";
  const compositeNote = String(formData.get("composite_note") ?? "").trim() || null;
  const tenantName = String(formData.get("tenant_display_name") ?? "").trim();
  const tenantPhone = String(formData.get("tenant_phone") ?? "").trim() || null;
  const tenantEmail = String(formData.get("tenant_email") ?? "").trim() || null;
  const annualRentRaw = String(formData.get("annual_rent_ngn") ?? "").trim();
  const annualRent = annualRentRaw === "" ? NaN : Number(annualRentRaw);
  const arrears = Number(formData.get("arrears_ngn"));
  const billingCadence = String(
    formData.get("billing_cadence") ?? "annual"
  ) as BillingCadence;
  const billingProfile = parseBillingProfileFromForm(formData);

  if (!unitCode) return { error: "Unit code is required." };
  if (!Number.isFinite(arrears) || arrears < 0) {
    return { error: "Arrears must be zero or a positive amount." };
  }
  if (annualRentRaw && (!Number.isFinite(annualRent) || annualRent < 0)) {
    return { error: "Annual rent must be a valid amount." };
  }

  const admin = createAdminClient();
  const { data: unit } = await admin
    .from("units")
    .select("id, site_id, organization_id")
    .eq("id", unitId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!unit) return { error: "Unit not found." };

  const { error: unitError } = await admin
    .from("units")
    .update({
      unit_code: unitCode,
      unit_code_normalized: unitCode.toLowerCase().replace(/\s+/g, ""),
      is_composite: isCompositeCode(unitCode),
      composite_note: compositeNote,
      property_type: propertyType,
      status: tenantName ? "occupied" : status,
      arrears_balance_ngn: arrears,
    })
    .eq("id", unitId);

  if (unitError) {
    if (unitError.code === "23505") {
      return { error: "Another unit in this property already uses that code." };
    }
    return { error: unitError.message };
  }

  const { data: activeLease } = await admin
    .from("leases")
    .select("id")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .maybeSingle();

  if (tenantName) {
    const { start, end } = currentYearRange();
    let tenantUserId: string | null = null;
    if (tenantEmail) {
      const { data: usersPage } = await admin.auth.admin.listUsers();
      tenantUserId =
        usersPage.users.find(
          (u) => u.email?.toLowerCase() === tenantEmail.toLowerCase()
        )?.id ?? null;
    }

    if (activeLease) {
      const updatePayload: Record<string, string | null> = {
        tenant_display_name: tenantName,
        tenant_phone: tenantPhone,
        tenant_email: tenantEmail,
      };
      if (tenantUserId) updatePayload.tenant_user_id = tenantUserId;

      const { error: leaseError } = await admin
        .from("leases")
        .update(updatePayload)
        .eq("id", activeLease.id);
      if (leaseError) return { error: leaseError.message };
    } else {
      const { data: defaultAccount } = await admin
        .from("site_settlement_accounts")
        .select("id")
        .eq("site_id", unit.site_id)
        .eq("is_default", true)
        .maybeSingle();

      const { data: newLease, error: leaseError } = await admin
        .from("leases")
        .insert({
          unit_id: unitId,
          tenant_display_name: tenantName,
          tenant_phone: tenantPhone,
          tenant_email: tenantEmail,
          tenant_user_id: tenantUserId,
          settlement_account_id: defaultAccount?.id ?? null,
          start_date: start,
          end_date: end,
          billing_cadence: "annual",
          status: "active",
        })
        .select("id")
        .single();

      if (leaseError || !newLease) {
        return { error: leaseError?.message ?? "Could not create lease." };
      }

      await admin
        .from("leases")
        .update({ billing_cadence: billingCadence })
        .eq("id", newLease.id);

      if (billingProfile.baseRentNgn > 0) {
        await regenerateLedgerForUnit(admin, ctx.org.id, unitId, billingProfile);
      }
    }
  }

  if (activeLease) {
    await admin
      .from("leases")
      .update({ billing_cadence: billingCadence })
      .eq("id", activeLease.id);

    if (billingProfile.baseRentNgn > 0 || annualRentRaw) {
      await regenerateLedgerForUnit(admin, ctx.org.id, unitId, billingProfile);
    }
  }

  await revalidatePropertyDashboardPaths(
    orgSlug,
    ctx.org.id,
    unit.site_id,
    unitCode
  );
  revalidatePath(`/d/${orgSlug}/tenants`);
  return { success: true };
}

export async function deleteUnit(
  orgSlug: string,
  unitId: string,
  propertyId: string
): Promise<UnitActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canAddUnits(ctx.role)) {
    return { error: "Only the landlord can delete units." };
  }

  const admin = createAdminClient();
  const { data: unit } = await admin
    .from("units")
    .select("id")
    .eq("id", unitId)
    .eq("organization_id", ctx.org.id)
    .eq("site_id", propertyId)
    .maybeSingle();

  if (!unit) return { error: "Unit not found." };

  const { count } = await admin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("unit_id", unitId)
    .eq("status", "pending");

  if ((count ?? 0) > 0) {
    return { error: "Resolve pending payments before deleting this unit." };
  }

  const { error } = await admin.from("units").delete().eq("id", unitId);
  if (error) return { error: error.message };

  const property = await getPropertyForOrg(ctx.org.id, propertyId);
  await revalidatePropertyDashboardPaths(orgSlug, ctx.org.id, propertyId);
  redirect(propertyPath(orgSlug, property?.slug ?? propertyId));
}
