"use server";

import { revalidatePath } from "next/cache";
import { requireStaffContext } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MembershipRole } from "@/types/database";

export type TeamActionState = {
  error?: string;
  success?: boolean;
};

export type TeamMember = {
  id: string;
  userId: string;
  email: string | null;
  role: MembershipRole;
};

export async function listTeamMembers(orgSlug: string): Promise<TeamMember[]> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") return [];

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("memberships")
    .select("id, user_id, role")
    .eq("organization_id", ctx.org.id)
    .order("role");

  if (!rows?.length) return [];

  const { data: usersPage } = await admin.auth.admin.listUsers();
  const emailById = new Map(
    usersPage.users.map((u) => [u.id, u.email ?? null])
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: emailById.get(row.user_id) ?? null,
    role: row.role as MembershipRole,
  }));
}

export async function inviteTeamMember(
  orgSlug: string,
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") {
    return { error: "Only the landlord can invite team members." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "manager") as MembershipRole;

  if (!email) return { error: "Email is required." };
  if (role !== "manager" && role !== "agent") {
    return { error: "Choose manager or agent." };
  }

  const admin = createAdminClient();
  const { data: usersPage } = await admin.auth.admin.listUsers();
  const user = usersPage.users.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (!user) {
    return {
      error:
        "No account with that email yet. Ask them to sign up at /login first, then invite again.",
    };
  }

  const { data: existing } = await admin
    .from("memberships")
    .select("id")
    .eq("organization_id", ctx.org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return { error: "This person is already on your team." };
  }

  const { error } = await admin.from("memberships").insert({
    organization_id: ctx.org.id,
    user_id: user.id,
    role,
  });

  if (error) return { error: error.message };

  revalidatePath(`/d/${orgSlug}/settings`);
  return { success: true };
}

export async function removeTeamMember(
  orgSlug: string,
  membershipId: string
): Promise<TeamActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") {
    return { error: "Only the landlord can remove team members." };
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("memberships")
    .select("id, role, user_id")
    .eq("id", membershipId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!row) return { error: "Team member not found." };
  if (row.role === "owner") {
    return { error: "You cannot remove the landlord account." };
  }
  if (row.user_id === ctx.user.id) {
    return { error: "You cannot remove yourself." };
  }

  const { error } = await admin.from("memberships").delete().eq("id", membershipId);
  if (error) return { error: error.message };

  revalidatePath(`/d/${orgSlug}/settings`);
  return { success: true };
}
