"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canAddUnits } from "@/lib/auth/roles";
import { requireStaffContext } from "@/lib/auth/session";
import { getDefaultSiteId } from "@/lib/data/units";
import { createClient } from "@/lib/supabase/server";
import type { PropertyType } from "@/types/database";

export type UnitActionState = {
  error?: string;
  success?: boolean;
};

function isCompositeCode(code: string): boolean {
  return /[/&]/.test(code);
}

export async function createUnit(
  orgSlug: string,
  _prev: UnitActionState,
  formData: FormData
): Promise<UnitActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canAddUnits(ctx.role)) {
    return { error: "Only the landlord can add units." };
  }

  if (ctx.demoMode) {
    return { error: "Demo mode — connect Supabase auth to create real units." };
  }

  const unitCode = String(formData.get("unit_code") ?? "").trim();
  const propertyType = String(formData.get("property_type") ?? "shop") as PropertyType;
  const compositeNote = String(formData.get("composite_note") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "vacant") as
    | "vacant"
    | "occupied"
    | "maintenance";

  if (!unitCode) {
    return { error: "Unit code is required." };
  }

  const siteId = await getDefaultSiteId(ctx.org.id);
  if (!siteId) {
    return { error: "No plaza found for this organization." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .insert({
      organization_id: ctx.org.id,
      site_id: siteId,
      unit_code: unitCode,
      unit_code_normalized: unitCode.toLowerCase().replace(/\s+/g, ""),
      is_composite: isCompositeCode(unitCode),
      composite_note: compositeNote,
      property_type: propertyType,
      status,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A unit with this code already exists in the plaza." };
    }
    return { error: error.message };
  }

  revalidatePath(`/d/${orgSlug}/units`);
  redirect(`/d/${orgSlug}/units/${data.id}`);
}
