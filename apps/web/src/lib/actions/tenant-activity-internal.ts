"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { TenantEngagementEventType } from "@/lib/data/tenant-activity";

/** Internal helper — no auth check; callers must validate context first. */
export async function recordTenantEngagementInternal(input: {
  orgId: string;
  tenantUserId: string;
  leaseId: string | null;
  unitId: string | null;
  eventType: TenantEngagementEventType;
  metadata?: Record<string, string>;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("tenant_engagement_events").insert({
      organization_id: input.orgId,
      tenant_user_id: input.tenantUserId,
      lease_id: input.leaseId,
      unit_id: input.unitId,
      event_type: input.eventType,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Non-blocking for primary user flows
  }
}
