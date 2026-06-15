"use server";

import { revalidatePath } from "next/cache";
import { requireStaffContext } from "@/lib/auth/session";
import { getPropertyForOrg } from "@/lib/data/sites";
import { SITE_TYPE_OPTIONS } from "@/lib/data/property-types";
import { createClient } from "@/lib/supabase/server";
import type { Site } from "@/types/database";

export type PropertyActionState = {
  error?: string;
  success?: boolean;
};

const SITE_TYPES = SITE_TYPE_OPTIONS.map((option) => option.value);

export async function saveProperty(
  orgSlug: string,
  _prev: PropertyActionState,
  formData: FormData
): Promise<PropertyActionState> {
  const ctx = await requireStaffContext(orgSlug);

  if (ctx.role !== "owner") {
    return { error: "Only the landlord can add or edit properties." };
  }

  if (ctx.demoMode) {
    return { error: "Demo mode — sign in with Supabase to save properties." };
  }

  const propertyId = String(formData.get("property_id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const siteType = String(formData.get("site_type") ?? "plaza") as Site["site_type"];
  const addressLine1 = String(formData.get("address_line1") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();

  if (!name) {
    return { error: "Property name is required." };
  }

  if (!SITE_TYPES.includes(siteType)) {
    return { error: "Choose a valid property type." };
  }

  const address = {
    line1: addressLine1,
    city,
    state,
    country: "NG",
  };

  const supabase = await createClient();

  if (propertyId) {
    const existing = await getPropertyForOrg(ctx.org.id, propertyId, false);
    if (!existing) {
      return { error: "Property not found." };
    }

    const { error } = await supabase
      .from("sites")
      .update({
        name,
        site_type: siteType,
        address,
      })
      .eq("id", propertyId)
      .eq("organization_id", ctx.org.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("sites").insert({
      organization_id: ctx.org.id,
      name,
      site_type: siteType,
      address,
    });

    if (error) return { error: error.message };
  }

  revalidatePath(`/d/${orgSlug}/settings`);
  revalidatePath(`/d/${orgSlug}/units`);
  revalidatePath(`/d/${orgSlug}/units/new`);

  return { success: true };
}

/** @deprecated Use saveProperty */
export async function savePlaza(
  orgSlug: string,
  prev: PropertyActionState,
  formData: FormData
): Promise<PropertyActionState> {
  return saveProperty(orgSlug, prev, formData);
}

export type PlazaActionState = PropertyActionState;
