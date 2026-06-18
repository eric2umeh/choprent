"use client";

import { useEffect, useRef } from "react";
import { recordTenantEngagement } from "@/lib/actions/reports";
import type { TenantEngagementEventType } from "@/lib/data/tenant-activity";

/** Fires a one-time tenant engagement event per browser session. */
export function TenantEngagementBeacon({
  orgSlug,
  eventType,
}: {
  orgSlug: string;
  eventType: TenantEngagementEventType;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const key = `choprent-engagement-${orgSlug}-${eventType}`;
    if (sessionStorage.getItem(key)) return;

    fired.current = true;
    void recordTenantEngagement(orgSlug, eventType).then((result) => {
      if (result.success) sessionStorage.setItem(key, "1");
    });
  }, [orgSlug, eventType]);

  return null;
}
