"use server";

import { revalidatePath } from "next/cache";
import { canManageLeases } from "@/lib/auth/roles";
import { requireStaffContext } from "@/lib/auth/session";
import {
  MIN_PASSWORD_LENGTH,
  MIN_PASSWORD_MESSAGE,
} from "@/lib/auth/password-validation";
import { appUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import { canonicalOrgSlug } from "@/lib/auth/session";
import { createHash, randomBytes } from "crypto";

export type TenantInviteActionState = {
  error?: string;
  success?: boolean;
  emailSent?: boolean;
  /** Present when the email could not be sent — share this link manually. */
  inviteUrl?: string;
  email?: string;
  orgSlug?: string;
  alreadyLinked?: boolean;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function tenantInviteEmailHtml(input: {
  tenantName: string;
  orgName: string;
  unitCode: string;
  inviteUrl: string;
}): string {
  return `
    <p>Dear ${input.tenantName},</p>
    <p>You have been invited to the ChopRent tenant portal for <strong>Unit ${input.unitCode}</strong> at <strong>${input.orgName}</strong>.</p>
    <p>Use the link below to create your password and open your dashboard. No role selection is needed — this link is only for your tenancy.</p>
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
  // Prefer generateLink / getUserByEmail if available via listUsers pagination
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

export async function inviteTenant(
  orgSlug: string,
  leaseId: string
): Promise<TenantInviteActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!canManageLeases(ctx.role)) {
    return { error: "You don't have permission to invite tenants." };
  }

  const admin = createAdminClient();
  const { data: lease } = await admin
    .from("leases")
    .select(
      "id, tenant_email, tenant_display_name, tenant_user_id, status, units!inner(unit_code, organization_id)"
    )
    .eq("id", leaseId)
    .eq("status", "active")
    .maybeSingle();

  if (!lease) return { error: "Active lease not found." };

  const units = lease.units as
    | { unit_code: string; organization_id: string }
    | { unit_code: string; organization_id: string }[]
    | null;
  const unit = Array.isArray(units) ? units[0] : units;
  if (!unit || unit.organization_id !== ctx.org.id) {
    return { error: "Lease not found in this organization." };
  }

  const email = (lease.tenant_email ?? "").trim().toLowerCase();
  if (!email) {
    return {
      error: "Add a tenant email on the lease first, then send the invite.",
    };
  }

  // If auth user already exists, link lease immediately and still send portal link email
  const existingUserId = await findAuthUserIdByEmail(admin, email);
  if (existingUserId && lease.tenant_user_id !== existingUserId) {
    await admin
      .from("leases")
      .update({ tenant_user_id: existingUserId })
      .eq("id", leaseId);
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Invalidate prior unused invites for this lease
  await admin
    .from("tenant_invites")
    .delete()
    .eq("lease_id", leaseId)
    .is("accepted_at", null);

  const { error: insertError } = await admin.from("tenant_invites").insert({
    organization_id: ctx.org.id,
    lease_id: leaseId,
    email,
    token: tokenHash,
    invited_by: ctx.user.id,
    expires_at: expiresAt,
  });

  if (insertError) return { error: insertError.message };

  const inviteUrl = `${appUrl()}/invite/tenant/${rawToken}`;
  const sent = await sendEmail({
    to: email,
    subject: `Your ChopRent access for Unit ${unit.unit_code}`,
    html: tenantInviteEmailHtml({
      tenantName: lease.tenant_display_name,
      orgName: ctx.org.name,
      unitCode: unit.unit_code,
      inviteUrl,
    }),
  });

  revalidatePath(`/d/${orgSlug}/tenants`);
  revalidatePath(`/d/${orgSlug}/tenants/${leaseId}`);

  if (sent.ok) {
    return {
      success: true,
      emailSent: true,
      alreadyLinked: !!(existingUserId || lease.tenant_user_id),
    };
  }

  // Email delivery unavailable (e.g. RESEND_API_KEY not set) — the invite is
  // still valid, so hand the link to staff to share via WhatsApp/SMS.
  if (process.env.NODE_ENV === "development") {
    console.info("[tenant-invite:dev link]", inviteUrl);
  }
  return {
    success: true,
    emailSent: false,
    inviteUrl,
    alreadyLinked: !!(existingUserId || lease.tenant_user_id),
  };
}

export type TenantInvitePreview = {
  error?: string;
  email?: string;
  tenantName?: string;
  unitCode?: string;
  orgName?: string;
  orgSlug?: string;
  expired?: boolean;
  alreadyAccepted?: boolean;
};

export async function getTenantInvitePreview(
  rawToken: string
): Promise<TenantInvitePreview> {
  if (!rawToken) return { error: "Invalid invite link." };

  const admin = createAdminClient();
  const tokenHash = hashToken(rawToken);
  const { data: invite } = await admin
    .from("tenant_invites")
    .select(
      "id, email, expires_at, accepted_at, organization_id, lease_id, organizations(id, name, slug), leases(tenant_display_name, units(unit_code))"
    )
    .eq("token", tokenHash)
    .maybeSingle();

  if (!invite) return { error: "This invite link is invalid or has expired." };

  const org = invite.organizations as
    | { id: string; name: string; slug: string }
    | { id: string; name: string; slug: string }[]
    | null;
  const orgRow = Array.isArray(org) ? org[0] : org;
  const lease = invite.leases as
    | {
        tenant_display_name: string;
        units: { unit_code: string } | { unit_code: string }[] | null;
      }
    | {
        tenant_display_name: string;
        units: { unit_code: string } | { unit_code: string }[] | null;
      }[]
    | null;
  const leaseRow = Array.isArray(lease) ? lease[0] : lease;
  const units = leaseRow?.units;
  const unit = Array.isArray(units) ? units[0] : units;

  const base = {
    email: invite.email,
    tenantName: leaseRow?.tenant_display_name,
    unitCode: unit?.unit_code,
    orgName: orgRow?.name,
    orgSlug: orgRow ? canonicalOrgSlug(orgRow) : undefined,
  };

  if (invite.accepted_at) {
    return {
      ...base,
      alreadyAccepted: true,
    };
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return {
      ...base,
      expired: true,
      error: "This invite link has expired. Ask your manager to send a new one.",
    };
  }

  return base;
}

export async function acceptTenantInvite(
  rawToken: string,
  password: string,
  fullName?: string
): Promise<TenantInviteActionState> {
  if (!rawToken) return { error: "Invalid invite link." };
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { error: MIN_PASSWORD_MESSAGE };
  }

  const admin = createAdminClient();
  const tokenHash = hashToken(rawToken);
  const { data: invite } = await admin
    .from("tenant_invites")
    .select(
      "id, email, expires_at, accepted_at, lease_id, organization_id, organizations(id, slug)"
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

  // Idempotent: if invite was already accepted, still allow sign-in to the portal
  // as long as the lease is linked (or can be linked) to this email.
  if (invite.accepted_at) {
    let userId = await findAuthUserIdByEmail(admin, email);
    if (!userId) {
      return {
        error: "This invite was already used. Sign in with the password you created.",
      };
    }

    const { data: lease } = await admin
      .from("leases")
      .select("id, tenant_user_id, status")
      .eq("id", invite.lease_id)
      .maybeSingle();

    if (!lease || lease.status !== "active") {
      return { error: "This tenancy is no longer active." };
    }

    if (lease.tenant_user_id !== userId) {
      await admin
        .from("leases")
        .update({ tenant_user_id: userId, tenant_email: email })
        .eq("id", invite.lease_id);
    }

    // Ensure password matches what they just entered (re-entry after a failed redirect).
    await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });

    return {
      success: true,
      email,
      orgSlug: canonicalOrgSlug(orgRow),
      alreadyLinked: true,
    };
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { error: "This invite link has expired. Ask your manager to send a new one." };
  }

  const { data: lease } = await admin
    .from("leases")
    .select("id, tenant_display_name, status")
    .eq("id", invite.lease_id)
    .eq("status", "active")
    .maybeSingle();

  if (!lease) return { error: "This tenancy is no longer active." };

  let userId = await findAuthUserIdByEmail(admin, email);

  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName?.trim() || lease.tenant_display_name,
        role: "tenant",
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
        full_name: fullName?.trim() || lease.tenant_display_name,
        role: "tenant",
      },
    });
    if (updateError) {
      return { error: updateError.message };
    }
  }

  const { error: linkError } = await admin
    .from("leases")
    .update({
      tenant_user_id: userId,
      tenant_email: email,
    })
    .eq("id", invite.lease_id);

  if (linkError) return { error: linkError.message };

  await admin
    .from("tenant_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  revalidatePath(`/d/${canonicalOrgSlug(orgRow)}/tenants`);
  revalidatePath(`/t/${canonicalOrgSlug(orgRow)}`);

  return {
    success: true,
    email,
    orgSlug: canonicalOrgSlug(orgRow),
  };
}
