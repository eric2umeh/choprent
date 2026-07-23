"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markDashboardNotificationsRead } from "@/lib/actions/notifications";

/**
 * On dashboard view, mark unread staff notifications as read and refresh
 * the shell so the sidebar badge clears.
 */
export function MarkDashboardNotificationsRead({
  orgSlug,
  hasUnread,
}: {
  orgSlug: string;
  hasUnread: boolean;
}) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (!hasUnread || ran.current) return;
    ran.current = true;
    void markDashboardNotificationsRead(orgSlug).then((result) => {
      if (result.cleared > 0) router.refresh();
    });
  }, [orgSlug, hasUnread, router]);

  return null;
}
