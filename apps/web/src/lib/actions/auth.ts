"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { provisionLandlordOrganization } from "@/lib/auth/org-provision";
import { getSessionUser } from "@/lib/auth/session";
import {
  createAdminClient,
  PILOT_ORG_ID,
  PILOT_SITE_ID,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { MembershipRole } from "@/types/database";

export type AuthActionState = {
  error?: string;
  success?: boolean;
};

const STAFF_ROLES: MembershipRole[] = ["owner", "manager", "agent"];

async function ensurePilotSiteExists(admin: ReturnType<typeof createAdminClient>) {
  const { count } = await admin
    .from("sites")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", PILOT_ORG_ID);

  if ((count ?? 0) > 0) return;

  const { error } = await admin.from("sites").insert({
    organization_id: PILOT_ORG_ID,
    name: "Eri Plaza",
    site_type: "plaza",
    address: {
      line1: "12 Allen Avenue",
      city: "Ikeja",
      state: "Lagos",
      country: "NG",
    },
  });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

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

async function linkToPilotOrg(
  userId: string,
  role: Extract<MembershipRole, "manager" | "agent">
): Promise<AuthActionState> {
  const admin = createAdminClient();
  await ensurePilotSiteExists(admin);

  const { error: membershipError } = await admin.from("memberships").insert({
    user_id: userId,
    organization_id: PILOT_ORG_ID,
    role,
  });

  if (membershipError) {
    return { error: membershipError.message };
  }

  if (role === "agent") {
    const { error: assignError } = await admin.from("site_assignments").insert({
      user_id: userId,
      site_id: PILOT_SITE_ID,
    });
    if (assignError && assignError.code !== "23505") {
      return { error: assignError.message };
    }
  }

  revalidatePath("/access-pending");
  revalidatePath("/d/eri-plaza");
  return { success: true };
}

/**
 * Link a signed-in user to ChopRent staff access.
 * Landlords get a new organization. Managers/agents join the demo pilot org until invites ship.
 */
export async function linkPlazaAccount(
  role: MembershipRole
): Promise<AuthActionState> {
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
      const org = await provisionLandlordOrganization(user);
      revalidatePath("/access-pending");
      revalidatePath(`/d/${org.slug}`);
      revalidatePath(`/d/${org.slug}/settings`);
      return { success: true };
    }

    return linkToPilotOrg(user.id, role);
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
