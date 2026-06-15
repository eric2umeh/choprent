"use server";

import { revalidatePath } from "next/cache";
import { requireStaffContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type OrgSettingsActionState = {
  error?: string;
  success?: boolean;
};

const LOGO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function updateOrgProfile(
  orgSlug: string,
  _prev: OrgSettingsActionState,
  formData: FormData
): Promise<OrgSettingsActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") {
    return { error: "Only the landlord can update account settings." };
  }

  const ownerDisplayName = String(formData.get("owner_display_name") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const logo = formData.get("logo");

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", ctx.org.id)
    .maybeSingle();

  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  settings.owner_display_name = ownerDisplayName || null;
  settings.company_name = companyName || null;

  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 2 * 1024 * 1024) {
      return { error: "Logo must be 2MB or less." };
    }
    if (!LOGO_MIME.has(logo.type)) {
      return { error: "Logo must be JPG, PNG, or WebP." };
    }
    const ext = logo.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${ctx.org.id}/branding/logo.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, logo, { upsert: true, contentType: logo.type });
    if (uploadError) return { error: uploadError.message };
    settings.logo_path = path;
  }

  const orgDisplayName = companyName || ownerDisplayName || ctx.org.name;
  const { error } = await supabase
    .from("organizations")
    .update({ name: orgDisplayName, settings })
    .eq("id", ctx.org.id);

  if (error) return { error: error.message };

  revalidatePath(`/d/${orgSlug}/settings`);
  revalidatePath(`/d/${orgSlug}`, "layout");
  revalidatePath(`/t/${orgSlug}`, "layout");
  return { success: true };
}

export async function changePassword(
  orgSlug: string,
  _prev: OrgSettingsActionState,
  formData: FormData
): Promise<OrgSettingsActionState> {
  await requireStaffContext(orgSlug);

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: true };
}
