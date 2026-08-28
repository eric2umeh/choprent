import { NextResponse } from "next/server";
import { recordUsageEventInternal } from "@/lib/actions/usage-events-internal";
import {
  getOrganizationBySlug,
  getSessionUser,
} from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUsageEventType } from "@/lib/usage-events/types";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    orgSlug?: string;
    eventType?: string;
    metadata?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orgSlug = body.orgSlug?.trim();
  const eventType = body.eventType?.trim();

  if (!orgSlug || !eventType || !isUsageEventType(eventType)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const org = await getOrganizationBySlug(orgSlug);
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: staffMembership } = await admin
    .from("memberships")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: tenantLease } = await admin
    .from("leases")
    .select("id, units!inner(organization_id)")
    .eq("tenant_user_id", user.id)
    .eq("status", "active")
    .eq("units.organization_id", org.id)
    .maybeSingle();

  if (!staffMembership && !tenantLease) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userAgent = request.headers.get("user-agent");

  await recordUsageEventInternal({
    orgId: org.id,
    userId: user.id,
    eventType,
    userAgent,
    metadata: {
      ...(body.metadata ?? {}),
      audience: staffMembership ? "staff" : "tenant",
      role: staffMembership?.role ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
