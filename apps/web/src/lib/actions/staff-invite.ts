"use server";

import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "crypto";
import { canManageTeam } from "@/lib/auth/roles";
import { requireStaffContext, canonicalOrgSlug } from "@/lib/auth/session";
import {
  MIN_PASSWORD_LENGTH,
  MIN_PASSWORD_MESSAGE,
} from "@/lib/auth/password-validation";
import { appUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MembershipRole } from "@/types/database";

export type StaffInviteActionState = {
  error?: string;
  success?: boolean;
  emailSent?: boolean;
  inviteUrl?: string;
  email?: string;
  orgSlug?: string;
  warning?: string;
  alreadyLinked?: boolean;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function staffInviteEmailHtml(input: {
  orgName: string;
  role: string;
  inviteUrl: string;
}): string {
  const roleLabel =
    input.role === "admin"
      ? "an admin"
      : input.role === "manager"
        ? "a manager"
        : "an agent";
  return `
    <p>Hello,</p>
    <p>You have been invited to join <strong>${input.orgName}</strong> on ChopRent as ${roleLabel}.</p>
    <p>Use the link below to create your password and open the staff dashboard.</p>
    <p><a href="${input.inviteUrl}">Accept invite and set up access</a></p>
    <p>This link expires in 7 days. If you did not expect this email, you can ignore it.</p>
    <p style="color:#666;font-size:12px">If the button does not work, copy this link:<br>${input.inviteUrl}</p>
  `;
}

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<string | null> {
  const normalized = email.toLowerCase();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
    if (page > 20) break;
  }
  return null;
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

/** Create a staff invite link and email it (or return URL for manual share). */
export async function createStaffInvite(
  orgSlug: string,
  formData: FormData
): Promise<StaffInviteActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageTeam(ctx.role)) {
    return { error: "Only the landlord or an admin can invite team members." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "manager") as MembershipRole;
  const assignAll = formData.get("assign_all_sites") === "on";
  const siteIds = formData
    .getAll("site_ids")
    .map((v) => String(v))
    .filter(Boolean);

  if (!email) return { error: "Email is required." };
  if (role === "owner") {
    return { error: "Landlord accounts cannot be invited. They sign up directly." };
  }
  if (role === "admin" && ctx.role !== "owner") {
    return { error: "Only the landlord can invite an admin." };
  }
  if (role !== "manager" && role !== "agent" && role !== "admin") {
    return { error: "Choose admin, manager, or agent." };
  }

  const admin = createAdminClient();

  const { data: sites } = await admin
    .from("sites")
    .select("id")
    .eq("organization_id", ctx.org.id);

  const allSiteIds = (sites ?? []).map((s) => s.id);
  let targetSiteIds = assignAll ? allSiteIds : siteIds;

  if (role === "agent" && targetSiteIds.length === 0) {
    return {
      error: "Agents need at least one property assigned. Select properties or choose all.",
    };
  }

  if (role !== "agent" && (assignAll || siteIds.length > 0) && targetSiteIds.length === 0) {
    targetSiteIds = allSiteIds;
  }

  const existingUserId = await findAuthUserIdByEmail(admin, email);
  if (existingUserId) {
    const { data: existingMembership } = await admin
      .from("memberships")
      .select("id")
      .eq("organization_id", ctx.org.id)
      .eq("user_id", existingUserId)
      .maybeSingle();
    if (existingMembership) {
      return { error: "This person is already on your team." };
    }
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await admin
    .from("staff_invites")
    .delete()
    .eq("organization_id", ctx.org.id)
    .eq("email", email)
    .is("accepted_at", null);

  const { error: insertError } = await admin.from("staff_invites").insert({
    organization_id: ctx.org.id,
    email,
    role,
    token: tokenHash,
    site_ids: targetSiteIds,
    invited_by: ctx.user.id,
    expires_at: expiresAt,
  });

  if (insertError) return { error: insertError.message };

  const inviteUrl = `${appUrl()}/invite/staff/${rawToken}`;
  const sent = await sendEmail({
    to: email,
    subject: `Join ${ctx.org.name} on ChopRent`,
    html: staffInviteEmailHtml({
      orgName: ctx.org.name,
      role,
      inviteUrl,
    }),
  });

  let warning: string | undefined;
  if (existingUserId) {
    const otherOrgs = await otherOrgNamesForUser(admin, existingUserId, ctx.org.id);
    if (otherOrgs.length > 0) {
      warning = `Note: this person already manages ${otherOrgs.join(", ")}. Accepting will also give them access here.`;
    }
  }

  revalidatePath(`/d/${orgSlug}/users`);
  revalidatePath(`/d/${orgSlug}/settings`);

  if (sent.ok) {
    return { success: true, emailSent: true, warning };
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[staff-invite:dev link]", inviteUrl);
  }

  return {
    success: true,
    emailSent: false,
    inviteUrl,
    warning,
  };
}

export type StaffInvitePreview = {
  error?: string;
  email?: string;
  orgName?: string;
  orgSlug?: string;
  role?: string;
  expired?: boolean;
  alreadyAccepted?: boolean;
};

export async function getStaffInvitePreview(
  rawToken: string
): Promise<StaffInvitePreview> {
  if (!rawToken) return { error: "Invalid invite link." };

  const admin = createAdminClient();
  const tokenHash = hashToken(rawToken);
  const { data: invite } = await admin
    .from("staff_invites")
    .select(
      "id, email, role, expires_at, accepted_at, organizations(id, name, slug)"
    )
    .eq("token", tokenHash)
    .maybeSingle();

  if (!invite) return { error: "This invite link is invalid or has expired." };

  const org = invite.organizations as
    | { id: string; name: string; slug: string }
    | { id: string; name: string; slug: string }[]
    | null;
  const orgRow = Array.isArray(org) ? org[0] : org;
  if (!orgRow) return { error: "Organization not found." };

  const base: StaffInvitePreview = {
    email: invite.email,
    orgName: orgRow.name,
    orgSlug: canonicalOrgSlug(orgRow),
    role: invite.role,
  };

  if (invite.accepted_at) {
    return { ...base, alreadyAccepted: true };
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return {
      ...base,
      expired: true,
      error: "This invite link has expired. Ask your landlord to send a new one.",
    };
  }

  return base;
}

export async function acceptStaffInvite(
  rawToken: string,
  password: string,
  fullName?: string
): Promise<StaffInviteActionState> {
  if (!rawToken) return { error: "Invalid invite link." };
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { error: MIN_PASSWORD_MESSAGE };
  }

  const admin = createAdminClient();
  const tokenHash = hashToken(rawToken);
  const { data: invite } = await admin
    .from("staff_invites")
    .select(
      "id, email, role, site_ids, expires_at, accepted_at, organization_id, organizations(id, slug)"
    )
    .eq("token", tokenHash)
    .maybeSingle();

  if (!invite) return { error: "This invite link is invalid or has expired." };

  const org = invite.organizations as
    | { id: string; slug: string }
    | { id: string; slug: string }[]
    | null;
  const orgRow = Array.isArray(org) ? org[0] : org;
  if (!orgRow) return { error: "Organization not found." };

  const email = invite.email.toLowerCase();
  const role = invite.role as MembershipRole;
  const siteIds = (invite.site_ids ?? []) as string[];
  const organizationId = invite.organization_id;
  const orgSlug = canonicalOrgSlug(orgRow);

  async function ensureMembership(userId: string) {
    const { data: existing } = await admin
      .from("memberships")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      const { error } = await admin.from("memberships").insert({
        organization_id: organizationId,
        user_id: userId,
        role,
        display_name: fullName?.trim() || null,
      });
      if (error) throw new Error(error.message);
    }

    if (siteIds.length > 0) {
      const { data: orgSites } = await admin
        .from("sites")
        .select("id")
        .eq("organization_id", organizationId);
      const orgSiteIds = (orgSites ?? []).map((s) => s.id);
      if (orgSiteIds.length > 0) {
        await admin
          .from("site_assignments")
          .delete()
          .eq("user_id", userId)
          .in("site_id", orgSiteIds);
      }
      await admin.from("site_assignments").insert(
        siteIds.map((siteId) => ({ user_id: userId, site_id: siteId }))
      );
    }
  }

  if (invite.accepted_at) {
    let userId = await findAuthUserIdByEmail(admin, email);
    if (!userId) {
      return {
        error: "This invite was already used. Sign in with the password you created.",
      };
    }
    await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    try {
      await ensureMembership(userId);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not join team." };
    }
    return { success: true, email, orgSlug, alreadyLinked: true };
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { error: "This invite link has expired. Ask your landlord to send a new one." };
  }

  let userId = await findAuthUserIdByEmail(admin, email);

  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName?.trim() || undefined,
        role,
      },
    });
    if (createError || !created.user) {
      return { error: createError?.message ?? "Could not create account." };
    }
    userId = created.user.id;
  } else {
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName?.trim() || undefined,
        role,
      },
    });
    if (updateError) return { error: updateError.message };
  }

  try {
    await ensureMembership(userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not join team." };
  }

  await admin
    .from("staff_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  revalidatePath(`/d/${orgSlug}/users`);
  revalidatePath(`/d/${orgSlug}`);

  return { success: true, email, orgSlug };
}
