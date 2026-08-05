"use server";

import { revalidatePath } from "next/cache";
import { requireStaffContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MIN_PASSWORD_LENGTH,
  MIN_PASSWORD_MESSAGE,
} from "@/lib/auth/password-validation";
import { slugify } from "@/lib/utils/slug";

export type OrgSettingsActionState = {
  error?: string;
  success?: boolean;
  /** Present when the landlord changed the workspace URL slug. */
  newSlug?: string;
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
  const workspaceName = String(formData.get("workspace_name") ?? "").trim();
  const slugRaw = String(formData.get("workspace_slug") ?? "").trim();
  const logo = formData.get("logo");

  const nextSlug = slugify(slugRaw || workspaceName || companyName || ctx.org.slug);
  if (!nextSlug || nextSlug === "property") {
    return { error: "Enter a valid workspace URL slug (letters and numbers)." };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: org, error: readError } = await supabase
    .from("organizations")
    .select("settings, slug, name")
    .eq("id", ctx.org.id)
    .maybeSingle();

  let orgRow = org;
  if (readError || !org) {
    const { data: adminOrg } = await admin
      .from("organizations")
      .select("settings, slug, name")
      .eq("id", ctx.org.id)
      .maybeSingle();
    orgRow = adminOrg;
  }

  if (!orgRow) return { error: "Organization not found." };

  if (nextSlug !== orgRow.slug) {
    const { data: taken } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", nextSlug)
      .neq("id", ctx.org.id)
      .maybeSingle();
    if (taken) {
      return { error: `The URL “${nextSlug}” is already in use. Choose another.` };
    }
  }

  const settings = (orgRow.settings ?? {}) as Record<string, unknown>;
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

  const orgDisplayName =
    workspaceName || companyName || ownerDisplayName || orgRow.name || ctx.org.name;

  const payload = {
    name: orgDisplayName,
    slug: nextSlug,
    settings,
  };

  const { error } = await supabase
    .from("organizations")
    .update(payload)
    .eq("id", ctx.org.id);

  if (error) {
    const { error: adminError } = await admin
      .from("organizations")
      .update(payload)
      .eq("id", ctx.org.id);
    if (adminError) return { error: adminError.message };
  }

  // Keep membership display_name in sync so audit labels show the person's name.
  if (ownerDisplayName) {
    await admin
      .from("memberships")
      .update({ display_name: ownerDisplayName })
      .eq("organization_id", ctx.org.id)
      .eq("user_id", ctx.user.id);
  }

  const slugChanged = nextSlug !== orgSlug;
  revalidatePath(`/d/${orgSlug}`, "layout");
  revalidatePath(`/t/${orgSlug}`, "layout");
  revalidatePath(`/d/${nextSlug}`, "layout");
  revalidatePath(`/t/${nextSlug}`, "layout");
  revalidatePath(`/d/${nextSlug}/settings`);

  return {
    success: true,
    newSlug: slugChanged ? nextSlug : undefined,
  };
}

/** Managers and agents can update their own display name for this org. */
export async function updateStaffDisplayName(
  orgSlug: string,
  _prev: OrgSettingsActionState,
  formData: FormData
): Promise<OrgSettingsActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role === "owner") {
    return { error: "Landlords update their name in the profile section above." };
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return { error: "Name is required." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("memberships")
    .update({ display_name: displayName })
    .eq("organization_id", ctx.org.id)
    .eq("user_id", ctx.user.id);

  if (error) return { error: error.message };

  revalidatePath(`/d/${orgSlug}/settings`);
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

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: MIN_PASSWORD_MESSAGE };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: true };
}
