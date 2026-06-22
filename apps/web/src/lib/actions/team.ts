"use server";

import { revalidatePath } from "next/cache";
import { requireStaffContext } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MembershipRole } from "@/types/database";

export type TeamActionState = {
  error?: string;
  success?: boolean;
  warning?: string;
};

export type TeamMember = {
  id: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  role: MembershipRole;
  siteIds: string[];
  siteNames: string[];
  otherOrganizations: string[];
};

export type ResignationRequest = {
  id: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  role: MembershipRole;
  reason: string | null;
  createdAt: string;
};

async function emailByUserId(admin: ReturnType<typeof createAdminClient>) {
  const { data: usersPage } = await admin.auth.admin.listUsers();
  return new Map(usersPage.users.map((u) => [u.id, u.email ?? null]));
}

async function otherOrgNamesForUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  currentOrgId: string
): Promise<string[]> {
  const { data: rows } = await admin
    .from("memberships")
    .select("organization_id, organizations(name)")
    .eq("user_id", userId)
    .neq("organization_id", currentOrgId);

  return (rows ?? [])
    .map((row) => {
      const org = row.organizations;
      if (org && typeof org === "object" && !Array.isArray(org) && "name" in org) {
        return (org as { name: string }).name;
      }
      return null;
    })
    .filter((name): name is string => !!name);
}

export async function listTeamMembers(orgSlug: string): Promise<TeamMember[]> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") return [];

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("memberships")
    .select("id, user_id, role, display_name")
    .eq("organization_id", ctx.org.id)
    .order("role");

  if (!rows?.length) return [];

  const emails = await emailByUserId(admin);
  const userIds = rows.map((r) => r.user_id);

  const { data: assignments } = await admin
    .from("site_assignments")
    .select("user_id, site_id, sites(name)")
    .in("user_id", userIds);

  const sitesByUser = new Map<string, { ids: string[]; names: string[] }>();
  for (const row of assignments ?? []) {
    const entry = sitesByUser.get(row.user_id) ?? { ids: [], names: [] };
    entry.ids.push(row.site_id);
    const site = row.sites;
    const name =
      site && typeof site === "object" && !Array.isArray(site) && "name" in site
        ? (site as { name: string }).name
        : "Property";
    entry.names.push(name);
    sitesByUser.set(row.user_id, entry);
  }

  const members: TeamMember[] = [];
  for (const row of rows) {
    const sites = sitesByUser.get(row.user_id) ?? { ids: [], names: [] };
    members.push({
      id: row.id,
      userId: row.user_id,
      email: emails.get(row.user_id) ?? null,
      displayName: row.display_name ?? null,
      role: row.role as MembershipRole,
      siteIds: sites.ids,
      siteNames: sites.names,
      otherOrganizations: await otherOrgNamesForUser(admin, row.user_id, ctx.org.id),
    });
  }

  return members;
}

export async function listPendingResignations(
  orgSlug: string
): Promise<ResignationRequest[]> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") return [];

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("membership_resignations")
    .select(
      "id, user_id, reason, created_at, memberships(role, display_name)"
    )
    .eq("organization_id", ctx.org.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (!rows?.length) return [];

  const emails = await emailByUserId(admin);

  return rows.map((row) => {
    const membership = row.memberships as
      | { role: MembershipRole; display_name: string | null }
      | { role: MembershipRole; display_name: string | null }[]
      | null;
    const m = Array.isArray(membership) ? membership[0] : membership;
    return {
      id: row.id,
      userId: row.user_id,
      email: emails.get(row.user_id) ?? null,
      displayName: m?.display_name ?? null,
      role: (m?.role ?? "manager") as MembershipRole,
      reason: row.reason,
      createdAt: row.created_at.slice(0, 10),
    };
  });
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
  const assignAll = formData.get("assign_all_sites") === "on";
  const siteIds = formData
    .getAll("site_ids")
    .map((v) => String(v))
    .filter(Boolean);

  if (!email) return { error: "Email is required." };
  if (role !== "manager" && role !== "agent") {
    return { error: "Choose manager or agent." };
  }

  const admin = createAdminClient();
  const { data: usersPage } = await admin.auth.admin.listUsers();
  const user = usersPage.users.find((u) => u.email?.toLowerCase() === email);

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

  const otherOrgs = await otherOrgNamesForUser(admin, user.id, ctx.org.id);
  const warning =
    otherOrgs.length > 0
      ? `Note: this person is already managing ${otherOrgs.join(", ")}. They will have access to your properties too.`
      : undefined;

  const { data: membership, error } = await admin
    .from("memberships")
    .insert({
      organization_id: ctx.org.id,
      user_id: user.id,
      role,
    })
    .select("id")
    .single();

  if (error || !membership) return { error: error?.message ?? "Could not add member." };

  if (role === "agent") {
    const { data: sites } = await admin
      .from("sites")
      .select("id")
      .eq("organization_id", ctx.org.id);

    const targetSiteIds = assignAll
      ? (sites ?? []).map((s) => s.id)
      : siteIds;

    if (targetSiteIds.length === 0) {
      return {
        error: "Agents need at least one property assigned. Select properties or choose all.",
      };
    }

    const rows = targetSiteIds.map((siteId) => ({
      user_id: user.id,
      site_id: siteId,
    }));

    const { error: assignError } = await admin.from("site_assignments").insert(rows);
    if (assignError) return { error: assignError.message };
  } else if (assignAll || siteIds.length > 0) {
    const { data: sites } = await admin
      .from("sites")
      .select("id")
      .eq("organization_id", ctx.org.id);

    const targetSiteIds = assignAll
      ? (sites ?? []).map((s) => s.id)
      : siteIds;

    if (targetSiteIds.length > 0) {
      const rows = targetSiteIds.map((siteId) => ({
        user_id: user.id,
        site_id: siteId,
      }));
      await admin.from("site_assignments").insert(rows);
    }
  }

  revalidatePath(`/d/${orgSlug}/users`);
  revalidatePath(`/d/${orgSlug}/settings`);
  return { success: true, warning };
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

  await admin.from("site_assignments").delete().eq("user_id", row.user_id);
  const { error } = await admin.from("memberships").delete().eq("id", membershipId);
  if (error) return { error: error.message };

  revalidatePath(`/d/${orgSlug}/users`);
  revalidatePath(`/d/${orgSlug}/settings`);
  return { success: true };
}

export async function requestResignation(
  orgSlug: string,
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "manager" && ctx.role !== "agent") {
    return { error: "Only managers and agents can request to leave." };
  }

  const reason = String(formData.get("reason") ?? "").trim() || null;
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("memberships")
    .select("id")
    .eq("organization_id", ctx.org.id)
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  if (!membership) return { error: "Membership not found." };

  const { data: pending } = await admin
    .from("membership_resignations")
    .select("id")
    .eq("membership_id", membership.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pending) return { error: "You already have a pending resignation request." };

  const { error } = await admin.from("membership_resignations").insert({
    membership_id: membership.id,
    user_id: ctx.user.id,
    organization_id: ctx.org.id,
    reason,
  });

  if (error) return { error: error.message };

  revalidatePath(`/d/${orgSlug}/settings`);
  return { success: true };
}

export async function respondToResignation(
  orgSlug: string,
  resignationId: string,
  accept: boolean,
  note?: string
): Promise<TeamActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") {
    return { error: "Only the landlord can respond to resignation requests." };
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("membership_resignations")
    .select("id, membership_id, user_id, status")
    .eq("id", resignationId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!row || row.status !== "pending") {
    return { error: "Resignation request not found." };
  }

  const status = accept ? "accepted" : "rejected";
  const { error: updateError } = await admin
    .from("membership_resignations")
    .update({
      status,
      responded_by: ctx.user.id,
      responded_at: new Date().toISOString(),
      response_note: note?.trim() || null,
    })
    .eq("id", resignationId);

  if (updateError) return { error: updateError.message };

  if (accept) {
    await admin.from("site_assignments").delete().eq("user_id", row.user_id);
    await admin.from("memberships").delete().eq("id", row.membership_id);
  }

  revalidatePath(`/d/${orgSlug}/users`);
  revalidatePath(`/d/${orgSlug}/settings`);
  return { success: true };
}
