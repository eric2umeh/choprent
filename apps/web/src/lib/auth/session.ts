import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, LEGACY_ORG_SLUG, PILOT_ORG_ID, PILOT_ORG_SLUG } from "@/lib/supabase/admin";
import type { MembershipRole } from "@/types/database";

export type AuthUser = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  initials: string;
};

export type OrgContext = {
  id: string;
  name: string;
  slug: string;
};

export type StaffContext = {
  user: AuthUser;
  org: OrgContext;
  role: MembershipRole;
  demoMode: boolean;
};

export type TenantContext = {
  user: AuthUser;
  org: OrgContext;
  unitId: string;
  leaseId: string;
  unitCode: string;
  tenantDisplayName: string;
  demoMode: boolean;
};

function initialsFrom(name: string, email: string | null): string {
  const base = name.trim() || email?.split("@")[0] || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

function mapAuthUser(
  user: { id: string; email?: string | null; phone?: string | null; user_metadata?: Record<string, unknown> }
): AuthUser {
  const meta = user.user_metadata ?? {};
  const displayName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "User";

  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    displayName,
    initials: initialsFrom(displayName, user.email ?? null),
  };
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return mapAuthUser(user);
}

function slugLookupCandidates(slug: string): string[] {
  if (slug === PILOT_ORG_SLUG || slug === LEGACY_ORG_SLUG) {
    return [PILOT_ORG_SLUG, LEGACY_ORG_SLUG];
  }
  return [slug];
}

/** Prefer the org's canonical slug in dashboard URLs when available. */
export function canonicalOrgSlug(org: { id: string; slug: string }): string {
  if (org.id === PILOT_ORG_ID) return PILOT_ORG_SLUG;
  return org.slug;
}

export async function getOrganizationBySlug(
  slug: string
): Promise<OrgContext | null> {
  const supabase = await createClient();

  for (const candidate of slugLookupCandidates(slug)) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", candidate)
      .maybeSingle();

    if (!error && data) {
      return { ...data, slug: canonicalOrgSlug(data) };
    }
  }

  return null;
}

async function getOrganizationBySlugAdmin(
  slug: string
): Promise<OrgContext | null> {
  try {
    const admin = createAdminClient();

    for (const candidate of slugLookupCandidates(slug)) {
      const { data } = await admin
        .from("organizations")
        .select("id, name, slug")
        .eq("slug", candidate)
        .maybeSingle();

      if (data) {
        return { ...data, slug: canonicalOrgSlug(data) };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function getStaffMembership(
  orgId: string,
  userId: string
): Promise<MembershipRole | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.role) return data.role as MembershipRole;

  try {
    const admin = createAdminClient();
    const { data: adminRow } = await admin
      .from("memberships")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();

    return (adminRow?.role as MembershipRole) ?? null;
  } catch {
    return null;
  }
}

function orgSlugFromJoin(payload: unknown): string | null {
  const org = orgFromJoin(payload);
  return org?.slug ?? null;
}

function orgFromJoin(
  payload: unknown
): { id: string; slug: string } | null {
  if (!payload || typeof payload !== "object") return null;
  if (Array.isArray(payload)) {
    const first = payload[0];
    if (
      first &&
      typeof first === "object" &&
      "slug" in first &&
      typeof first.slug === "string" &&
      "id" in first &&
      typeof first.id === "string"
    ) {
      return { id: first.id, slug: first.slug };
    }
    return null;
  }
  if (
    "slug" in payload &&
    typeof payload.slug === "string" &&
    "id" in payload &&
    typeof payload.id === "string"
  ) {
    return { id: payload.id, slug: payload.slug };
  }
  return null;
}

/** Server-only fallback after auth.getUser() — avoids RLS/session edge cases on fresh links. */
async function getStaffDashboardPathAdmin(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("memberships")
      .select("organizations(id, slug)")
      .eq("user_id", userId)
      .in("role", ["owner", "admin", "manager", "agent"])
      .limit(1)
      .maybeSingle();

    const org = orgFromJoin(data?.organizations);
    return org ? `/d/${canonicalOrgSlug(org)}` : null;
  } catch {
    return null;
  }
}

export async function resolvePostLoginPath(): Promise<string> {
  const user = await getSessionUser();
  if (!user) return "/login";

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, organizations(id, slug)")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin", "manager", "agent"])
    .limit(1)
    .maybeSingle();

  const orgFromMembership = orgFromJoin(membership?.organizations);

  if (orgFromMembership) {
    return `/d/${canonicalOrgSlug(orgFromMembership)}`;
  }

  if (membership?.organization_id) {
    const { data: orgRow } = await createAdminClient()
      .from("organizations")
      .select("id, slug")
      .eq("id", membership.organization_id)
      .maybeSingle();

    if (orgRow) {
      return `/d/${canonicalOrgSlug(orgRow)}`;
    }
  }

  const adminPath = await getStaffDashboardPathAdmin(user.id);
  if (adminPath) return adminPath;

  const { data: lease } = await supabase
    .from("leases")
    .select("units!inner(unit_code, sites!inner(organizations!inner(id, slug)))")
    .eq("tenant_user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const unitsPayload = lease?.units;
  if (unitsPayload && typeof unitsPayload === "object" && !Array.isArray(unitsPayload)) {
    const unit = unitsPayload as {
      sites?: {
        organizations?: { id?: string; slug?: string } | { id?: string; slug?: string }[];
      };
    };
    const orgs = unit.sites?.organizations;
    const org = Array.isArray(orgs) ? orgs[0] : orgs;
    if (org?.slug && org.id) {
      return `/t/${canonicalOrgSlug({ id: org.id, slug: org.slug })}`;
    }
    if (org?.slug) {
      return `/t/${org.slug === LEGACY_ORG_SLUG ? PILOT_ORG_SLUG : org.slug}`;
    }
  }

  return "/access-pending";
}

export async function requireStaffContext(orgSlug: string): Promise<StaffContext> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/d/${orgSlug}`);

  let org = await getOrganizationBySlug(orgSlug);
  if (!org) org = await getOrganizationBySlugAdmin(orgSlug);
  if (!org) notFound();

  const role = await getStaffMembership(org.id, user.id);
  if (!role) redirect("/login?error=no_access");

  return { user, org, role, demoMode: false };
}

export async function requireTenantContext(
  orgSlug: string
): Promise<TenantContext> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/t/${orgSlug}`);

  let org = await getOrganizationBySlug(orgSlug);
  if (!org) org = await getOrganizationBySlugAdmin(orgSlug);
  if (!org) notFound();

  const supabase = await createClient();
  const { data: lease } = await supabase
    .from("leases")
    .select("id, tenant_display_name, units!inner(id, unit_code, organization_id)")
    .eq("tenant_user_id", user.id)
    .eq("status", "active")
    .eq("units.organization_id", org.id)
    .limit(1)
    .maybeSingle();

  if (!lease) redirect("/login?error=no_access");

  const unitsPayload = lease.units;
  const unitCode =
    unitsPayload &&
    typeof unitsPayload === "object" &&
    !Array.isArray(unitsPayload) &&
    "unit_code" in unitsPayload
      ? (unitsPayload as { unit_code: string }).unit_code
      : "—";
  const unitId =
    unitsPayload &&
    typeof unitsPayload === "object" &&
    !Array.isArray(unitsPayload) &&
    "id" in unitsPayload
      ? (unitsPayload as { id: string }).id
      : "";

  return {
    user,
    org,
    unitId,
    leaseId: lease.id,
    unitCode,
    tenantDisplayName: lease.tenant_display_name,
    demoMode: false,
  };
}
