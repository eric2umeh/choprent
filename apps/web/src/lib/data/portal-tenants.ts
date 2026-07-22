import { createAdminClient } from "@/lib/supabase/admin";
import { sortByNaturalKey } from "@/lib/utils/natural-sort";

export type PortalTenantListItem = {
  userId: string;
  leaseId: string;
  unitId: string;
  tenantName: string;
  email: string | null;
  phone: string | null;
  unitCode: string;
  propertyName: string;
  propertySlug: string | null;
  startDate: string;
  endDate: string;
  inviteAcceptedAt: string | null;
  lastInviteSentAt: string | null;
  lastActivityAt: string | null;
  pendingPayments: number;
  verifiedPayments: number;
};

export type PortalTenantDetail = PortalTenantListItem & {
  authEmail: string | null;
  authCreatedAt: string | null;
  lastSignInAt: string | null;
  leases: {
    leaseId: string;
    unitCode: string;
    propertyName: string;
    startDate: string;
    endDate: string;
    status: string;
  }[];
  recentPayments: {
    id: string;
    amount: number;
    status: string;
    date: string;
    method: string;
  }[];
  recentActivity: {
    eventType: string;
    createdAt: string;
  }[];
};

type UnitJoin = {
  unit_code: string;
  sites: { name: string; slug?: string } | { name: string; slug?: string }[] | null;
};

function siteFromUnit(unit: UnitJoin | null) {
  if (!unit) return { name: "Property", slug: null as string | null };
  const sites = unit.sites;
  const site = Array.isArray(sites) ? sites[0] : sites;
  return { name: site?.name ?? "Property", slug: site?.slug ?? null };
}

/** Tenants with an auth account linked to an active lease in this org. */
export async function listPortalTenants(
  orgId: string
): Promise<PortalTenantListItem[]> {
  const admin = createAdminClient();

  // Prefer the DB view when available; otherwise query leases directly.
  const viewResult = await admin
    .from("portal_tenant_accounts" as never)
    .select(
      "user_id, lease_id, unit_id, tenant_display_name, tenant_email, tenant_phone, unit_code, site_name, site_slug, start_date, end_date, invite_accepted_at, last_invite_sent_at"
    )
    .eq("organization_id", orgId)
    .order("tenant_display_name", { ascending: true });

  let baseItems: PortalTenantListItem[] = [];

  if (!viewResult.error && viewResult.data) {
    const seen = new Set<string>();
    for (const row of viewResult.data as {
      user_id: string;
      lease_id: string;
      unit_id: string;
      tenant_display_name: string;
      tenant_email: string | null;
      tenant_phone: string | null;
      unit_code: string;
      site_name: string;
      site_slug: string | null;
      start_date: string;
      end_date: string;
      invite_accepted_at: string | null;
      last_invite_sent_at: string | null;
    }[]) {
      if (seen.has(row.user_id)) continue;
      seen.add(row.user_id);
      baseItems.push({
        userId: row.user_id,
        leaseId: row.lease_id,
        unitId: row.unit_id,
        tenantName: row.tenant_display_name,
        email: row.tenant_email,
        phone: row.tenant_phone,
        unitCode: row.unit_code,
        propertyName: row.site_name,
        propertySlug: row.site_slug,
        startDate: row.start_date,
        endDate: row.end_date,
        inviteAcceptedAt: row.invite_accepted_at,
        lastInviteSentAt: row.last_invite_sent_at,
        lastActivityAt: null,
        pendingPayments: 0,
        verifiedPayments: 0,
      });
    }
  } else {
    const { data: leases } = await admin
      .from("leases")
      .select(
        "id, tenant_user_id, tenant_display_name, tenant_email, tenant_phone, start_date, end_date, unit_id, units!inner(unit_code, organization_id, sites(name, slug))"
      )
      .eq("units.organization_id", orgId)
      .eq("status", "active")
      .not("tenant_user_id", "is", null);

    const seen = new Set<string>();
    for (const lease of leases ?? []) {
      const userId = lease.tenant_user_id as string;
      if (seen.has(userId)) continue;
      seen.add(userId);
      const units = lease.units as UnitJoin | UnitJoin[] | null;
      const unit = Array.isArray(units) ? units[0] : units;
      const site = siteFromUnit(unit ?? null);
      baseItems.push({
        userId,
        leaseId: lease.id,
        unitId: lease.unit_id,
        tenantName: lease.tenant_display_name,
        email: lease.tenant_email,
        phone: lease.tenant_phone,
        unitCode: unit?.unit_code ?? "—",
        propertyName: site.name,
        propertySlug: site.slug,
        startDate: lease.start_date,
        endDate: lease.end_date,
        inviteAcceptedAt: null,
        lastInviteSentAt: null,
        lastActivityAt: null,
        pendingPayments: 0,
        verifiedPayments: 0,
      });
    }
  }

  if (baseItems.length === 0) return [];

  const userIds = baseItems.map((t) => t.userId);
  const leaseIds = baseItems.map((t) => t.leaseId);

  const [{ data: events }, { data: payments }, { data: invites }] =
    await Promise.all([
      admin
        .from("tenant_engagement_events")
        .select("tenant_user_id, created_at")
        .eq("organization_id", orgId)
        .in("tenant_user_id", userIds)
        .order("created_at", { ascending: false }),
      admin
        .from("payments")
        .select("tenant_id, status")
        .eq("organization_id", orgId)
        .in("tenant_id", userIds),
      admin
        .from("tenant_invites")
        .select("lease_id, accepted_at, created_at")
        .in("lease_id", leaseIds)
        .order("created_at", { ascending: false }),
    ]);

  const lastActivity = new Map<string, string>();
  for (const e of events ?? []) {
    if (e.tenant_user_id && !lastActivity.has(e.tenant_user_id)) {
      lastActivity.set(e.tenant_user_id, e.created_at);
    }
  }

  const pendingByUser = new Map<string, number>();
  const verifiedByUser = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.tenant_id) continue;
    if (p.status === "pending") {
      pendingByUser.set(p.tenant_id, (pendingByUser.get(p.tenant_id) ?? 0) + 1);
    }
    if (p.status === "verified" || p.status === "auto_matched") {
      verifiedByUser.set(
        p.tenant_id,
        (verifiedByUser.get(p.tenant_id) ?? 0) + 1
      );
    }
  }

  const inviteAccepted = new Map<string, string>();
  const inviteSent = new Map<string, string>();
  for (const inv of invites ?? []) {
    if (!inviteSent.has(inv.lease_id)) {
      inviteSent.set(inv.lease_id, inv.created_at);
    }
    if (inv.accepted_at && !inviteAccepted.has(inv.lease_id)) {
      inviteAccepted.set(inv.lease_id, inv.accepted_at);
    }
  }

  const enriched = baseItems.map((t) => ({
    ...t,
    lastActivityAt: lastActivity.get(t.userId) ?? null,
    pendingPayments: pendingByUser.get(t.userId) ?? 0,
    verifiedPayments: verifiedByUser.get(t.userId) ?? 0,
    inviteAcceptedAt: t.inviteAcceptedAt ?? inviteAccepted.get(t.leaseId) ?? null,
    lastInviteSentAt: t.lastInviteSentAt ?? inviteSent.get(t.leaseId) ?? null,
  }));

  return sortByNaturalKey(enriched, (t) => t.unitCode);
}

export async function getPortalTenantDetail(
  orgId: string,
  userId: string
): Promise<PortalTenantDetail | null> {
  const admin = createAdminClient();
  const list = await listPortalTenants(orgId);
  const base = list.find((t) => t.userId === userId);
  if (!base) return null;

  const [
    { data: authUser },
    { data: allLeases },
    { data: payments },
    { data: activity },
  ] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .from("leases")
      .select(
        "id, start_date, end_date, status, units!inner(unit_code, organization_id, sites(name))"
      )
      .eq("tenant_user_id", userId)
      .eq("units.organization_id", orgId)
      .order("start_date", { ascending: false }),
    admin
      .from("payments")
      .select("id, amount_ngn, status, payment_method, payment_date, created_at")
      .eq("organization_id", orgId)
      .eq("tenant_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("tenant_engagement_events")
      .select("event_type, created_at")
      .eq("organization_id", orgId)
      .eq("tenant_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const leases = (allLeases ?? []).map((l) => {
    const units = l.units as UnitJoin | UnitJoin[] | null;
    const unit = Array.isArray(units) ? units[0] : units;
    const site = siteFromUnit(unit ?? null);
    return {
      leaseId: l.id,
      unitCode: unit?.unit_code ?? "—",
      propertyName: site.name,
      startDate: l.start_date,
      endDate: l.end_date,
      status: l.status,
    };
  });

  return {
    ...base,
    authEmail: authUser.user?.email ?? base.email,
    authCreatedAt: authUser.user?.created_at ?? null,
    lastSignInAt: authUser.user?.last_sign_in_at ?? null,
    leases,
    recentPayments: (payments ?? []).map((p) => ({
      id: p.id,
      amount: Number(p.amount_ngn),
      status: p.status,
      date: (p.payment_date ?? p.created_at).slice(0, 10),
      method: p.payment_method,
    })),
    recentActivity: (activity ?? []).map((a) => ({
      eventType: a.event_type,
      createdAt: a.created_at,
    })),
  };
}
