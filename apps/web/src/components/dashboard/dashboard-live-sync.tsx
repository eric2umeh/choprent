"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Subscribes to payment/unit/expense changes and refreshes server-rendered dashboard data. */
export function DashboardLiveSync({ orgId }: { orgId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

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
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "units",
          filter: `organization_id=eq.${orgId}`,
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "property_expenses",
          filter: `organization_id=eq.${orgId}`,
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ledger_periods",
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orgId, router]);

  return null;
}
