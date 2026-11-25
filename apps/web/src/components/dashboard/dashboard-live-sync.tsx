"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Subscribes to payment/unit/expense changes and refreshes server-rendered dashboard data. */
export function DashboardLiveSync({ orgId }: { orgId: string }) {
  const router = useRouter();
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Debounce refreshes so bursts of Realtime events don't fan out into
    // Auth + PostgREST + Storage log volume on every single change.
    const scheduleRefresh = () => {
      if (refreshTimer.current != null) {
        window.clearTimeout(refreshTimer.current);
      }
      refreshTimer.current = window.setTimeout(() => {
        refreshTimer.current = null;
        router.refresh();
      }, 1500);
    };

    const channel = supabase
      .channel(`dashboard-live-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `organization_id=eq.${orgId}`,
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "units",
          filter: `organization_id=eq.${orgId}`,
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "property_expenses",
          filter: `organization_id=eq.${orgId}`,
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ledger_periods",
        },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimer.current != null) {
        window.clearTimeout(refreshTimer.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [orgId, router]);

  return null;
}
