"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { provisionLandlordOrganization } from "@/lib/auth/org-provision";
import { getSessionUser } from "@/lib/auth/session";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MembershipRole } from "@/types/database";

export type AuthActionState = {
  error?: string;
  success?: boolean;
};

const STAFF_ROLES: MembershipRole[] = ["owner", "manager", "agent"];

async function getExistingStaffMembership(userId: string) {
  const admin = createAdminClient();
  return admin
    .from("memberships")
    .select("role, organization_id, organizations(slug)")
    .eq("user_id", userId)
    .in("role", ["owner", "manager", "agent"])
    .limit(1)
    .maybeSingle();
}

/**
 * Link a signed-in user to ChopRent staff access.
 * Landlords get a new organization. Managers/agents wait for a landlord invite.
 */
export async function linkPlazaAccount(
  role: MembershipRole,
  workspaceName?: string
): Promise<AuthActionState & { awaitingInvite?: boolean }> {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Please sign in first, then choose your role." };
  }

  if (!STAFF_ROLES.includes(role)) {
    return {
      error:
        "Shop tenants are set up by the plaza manager when your lease is ready. Ask them to register your email on your shop.",
    };
  }

  try {
    const { data: existing } = await getExistingStaffMembership(user.id);

    if (existing) {
      revalidatePath("/access-pending");
      const slug =
        existing.organizations &&
        typeof existing.organizations === "object" &&
        !Array.isArray(existing.organizations) &&
        "slug" in existing.organizations
          ? (existing.organizations as { slug: string }).slug
          : null;
      if (slug) revalidatePath(`/d/${slug}`);
      return { success: true };
    }

    if (role === "owner") {
      const org = await provisionLandlordOrganization(user, workspaceName);
      revalidatePath("/access-pending");
      revalidatePath(`/d/${org.slug}`);
      revalidatePath(`/d/${org.slug}/settings`);
      return { success: true };
    }

    return {
      success: true,
      awaitingInvite: true,
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not link your account. Contact support.",
    };
  }
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
