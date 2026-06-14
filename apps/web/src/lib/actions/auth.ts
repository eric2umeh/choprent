"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

async function plazaAlreadyHasLandlord(): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", PILOT_ORG_ID)
    .eq("role", "owner");

  return (count ?? 0) > 0;
}

/** Link the signed-in user to Eri Plaza with a staff role — no SQL required. */
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
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", PILOT_ORG_ID)
      .maybeSingle();

    if (existing) {
      revalidatePath("/access-pending");
      revalidatePath("/d/pilot-plaza");
      return { success: true };
    }

    if (role === "owner" && (await plazaAlreadyHasLandlord())) {
      return {
        error:
          "This plaza already has a landlord account. Choose Manager or Agent, or ask the landlord to add you from their dashboard (coming soon).",
      };
    }

    const { error: membershipError } = await admin.from("memberships").insert({
      user_id: user.id,
      organization_id: PILOT_ORG_ID,
      role,
    });

    if (membershipError) {
      return { error: membershipError.message };
    }

    if (role === "agent") {
      const { error: assignError } = await admin.from("site_assignments").insert({
        user_id: user.id,
        site_id: PILOT_SITE_ID,
      });
      if (assignError && assignError.code !== "23505") {
        return { error: assignError.message };
      }
    }

    revalidatePath("/access-pending");
    revalidatePath("/d/pilot-plaza");
    return { success: true };
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
