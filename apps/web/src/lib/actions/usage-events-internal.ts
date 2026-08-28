"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { UsageEventType } from "@/lib/usage-events/types";

/** Internal insert — callers must validate org access first. */
export async function recordUsageEventInternal(input: {
  orgId: string;
  userId: string | null;
  eventType: UsageEventType;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("usage_events").insert({
      organization_id: input.orgId,
      user_id: input.userId,
      event_type: input.eventType,
      user_agent: input.userAgent ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Non-blocking for primary user flows
  }
}
