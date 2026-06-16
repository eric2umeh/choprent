"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffContext } from "@/lib/auth/session";
import { getPropertyForOrg } from "@/lib/data/sites";
import { SITE_TYPE_OPTIONS } from "@/lib/data/property-types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Site } from "@/types/database";

export type PropertyActionState = {
  error?: string;
  success?: boolean;
};

const SITE_TYPES = SITE_TYPE_OPTIONS.map((option) => option.value);
const LOGO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function saveProperty(
  orgSlug: string,
  _prev: PropertyActionState,
  formData: FormData
): Promise<PropertyActionState> {
  const ctx = await requireStaffContext(orgSlug);

  if (ctx.role !== "owner") {
    return { error: "Only the landlord can add or edit properties." };
  }

  const propertyId = String(formData.get("property_id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const siteType = String(formData.get("site_type") ?? "plaza") as Site["site_type"];
  const addressLine1 = String(formData.get("address_line1") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const logo = formData.get("logo");

  if (!name) {
    return { error: "Property name is required." };
  }

  if (!SITE_TYPES.includes(siteType)) {
    return { error: "Choose a valid property type." };
  }

  const admin = createAdminClient();
  let existingAddress: Record<string, string> = {};

  if (propertyId) {
    const existing = await getPropertyForOrg(ctx.org.id, propertyId);
    if (!existing) return { error: "Property not found." };
    const { data: siteRow } = await admin
      .from("sites")
      .select("address")
      .eq("id", propertyId)
      .maybeSingle();
    existingAddress = (siteRow?.address ?? {}) as Record<string, string>;
  }

  const address: Record<string, string> = {
    line1: addressLine1,
    city,
    state,
    country: "NG",
    logo_path: existingAddress.logo_path ?? "",
  };

  if (logo instanceof File && logo.size > 0 && propertyId) {
    if (logo.size > 2 * 1024 * 1024) {
      return { error: "Logo must be 2MB or less." };
    }
    if (!LOGO_MIME.has(logo.type)) {
      return { error: "Logo must be JPG, PNG, or WebP." };
    }
    const ext = logo.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${ctx.org.id}/properties/${propertyId}/logo.${ext}`;
    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, logo, { upsert: true, contentType: logo.type });
    if (uploadError) return { error: uploadError.message };
    address.logo_path = path;
  }

  if (propertyId) {
    const { error } = await admin
      .from("sites")
      .update({ name, site_type: siteType, address })
      .eq("id", propertyId)
      .eq("organization_id", ctx.org.id);
    if (error) return { error: error.message };
  } else {
    const insertAddress = { ...address };
    delete insertAddress.logo_path;

    const { data: created, error } = await admin
      .from("sites")
      .insert({
        organization_id: ctx.org.id,
        name,
        site_type: siteType,
        address: insertAddress,
      })
      .select("id")
      .single();

    if (error || !created) {
      return { error: error?.message ?? "Could not create property." };
    }

    if (logo instanceof File && logo.size > 0) {
      const ext = logo.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${ctx.org.id}/properties/${created.id}/logo.${ext}`;
      const supabase = await createClient();
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, logo, { upsert: true, contentType: logo.type });
      if (uploadError) return { error: uploadError.message };
      await admin
        .from("sites")
        .update({
          address: { ...insertAddress, logo_path: path },
        })
        .eq("id", created.id);
    }
  }

  revalidatePath(`/d/${orgSlug}/properties`);
  revalidatePath(`/d/${orgSlug}/account`);
  revalidatePath(`/t/${orgSlug}`, "layout");
  return { success: true };
}

export async function deleteProperty(
  orgSlug: string,
  propertyId: string
): Promise<PropertyActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") {
    return { error: "Only the landlord can delete properties." };
  }

  const property = await getPropertyForOrg(ctx.org.id, propertyId);
  if (!property) return { error: "Property not found." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("sites")
    .delete()
    .eq("id", propertyId)
    .eq("organization_id", ctx.org.id);

  if (error) return { error: error.message };

  revalidatePath(`/d/${orgSlug}/properties`);
  redirect(`/d/${orgSlug}/properties`);
}

export type PlazaActionState = PropertyActionState;

/** @deprecated Use saveProperty */
export async function savePlaza(
  orgSlug: string,
  prev: PropertyActionState,
  formData: FormData
): Promise<PropertyActionState> {
  return saveProperty(orgSlug, prev, formData);
}
