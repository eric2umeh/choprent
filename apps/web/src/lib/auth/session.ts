import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/env";
import { getMockUser, MOCK_ORG, type MockRole } from "@/lib/mock/data";
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

export async function getOrganizationBySlug(
  slug: string
): Promise<OrgContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

async function getOrganizationBySlugAdmin(
  slug: string
): Promise<OrgContext | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle();

    return data ?? null;
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
  if (!payload || typeof payload !== "object") return null;
  if (Array.isArray(payload)) {
    const first = payload[0];
    return first &&
      typeof first === "object" &&
      "slug" in first &&
      typeof first.slug === "string"
      ? first.slug
      : null;
  }
  return "slug" in payload && typeof payload.slug === "string"
    ? payload.slug
    : null;
}

/** Server-only fallback after auth.getUser() — avoids RLS/session edge cases on fresh links. */
async function getStaffDashboardPathAdmin(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("memberships")
      .select("organizations(slug)")
      .eq("user_id", userId)
      .in("role", ["owner", "manager", "agent"])
      .limit(1)
      .maybeSingle();

    const slug = orgSlugFromJoin(data?.organizations);
    return slug ? `/d/${slug}` : null;
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
    .select("organization_id, organizations(slug)")
    .eq("user_id", user.id)
    .in("role", ["owner", "manager", "agent"])
    .limit(1)
    .maybeSingle();

  const slugFromJoin = orgSlugFromJoin(membership?.organizations);

  if (slugFromJoin) return `/d/${slugFromJoin}`;

  if (membership?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("slug")
      .eq("id", membership.organization_id)
      .maybeSingle();

    if (org?.slug) return `/d/${org.slug}`;
  }

  const adminPath = await getStaffDashboardPathAdmin(user.id);
  if (adminPath) return adminPath;

  const { data: lease } = await supabase
    .from("leases")
    .select("units!inner(unit_code, sites!inner(organizations!inner(slug)))")
    .eq("tenant_user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const unitsPayload = lease?.units;
  if (unitsPayload && typeof unitsPayload === "object" && !Array.isArray(unitsPayload)) {
    const unit = unitsPayload as {
      sites?: {
        organizations?: { slug?: string } | { slug?: string }[];
      };
    };
    const orgs = unit.sites?.organizations;
    const slug = Array.isArray(orgs) ? orgs[0]?.slug : orgs?.slug;
    if (slug) return `/t/${slug}`;
  }

  return "/access-pending";
}

export async function requireStaffContext(
  orgSlug: string,
  demoRole?: MockRole | null
): Promise<StaffContext> {
  if (isDemoMode()) {
    const role = (demoRole ?? "owner") as MembershipRole;
    const mock = getMockUser(role as MockRole);
    return {
      demoMode: true,
      org: { id: "demo", name: MOCK_ORG.name, slug: MOCK_ORG.slug },
      role,
      user: {
        id: mock.id,
        email: mock.email,
        phone: null,
        displayName: mock.name,
        initials: mock.initials,
      },
    };
  }

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
  if (isDemoMode()) {
    const mock = getMockUser("tenant");
    return {
      demoMode: true,
      org: { id: "demo", name: MOCK_ORG.name, slug: MOCK_ORG.slug },
      unitCode: "14",
      tenantDisplayName: mock.name,
      user: {
        id: mock.id,
        email: mock.email,
        phone: null,
        displayName: mock.name,
        initials: mock.initials,
      },
    };
  }

  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/t/${orgSlug}`);

  let org = await getOrganizationBySlug(orgSlug);
  if (!org) org = await getOrganizationBySlugAdmin(orgSlug);
  if (!org) notFound();

  const supabase = await createClient();
  const { data: lease } = await supabase
    .from("leases")
    .select("tenant_display_name, units!inner(unit_code, organization_id)")
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

  return {
    user,
    org,
    unitCode,
    tenantDisplayName: lease.tenant_display_name,
    demoMode: false,
  };
}
