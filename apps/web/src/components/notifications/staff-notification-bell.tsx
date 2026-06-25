"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import type { NotificationItem } from "@/lib/data/notifications";

export function StaffNotificationBell({
  orgSlug,
  notifications,
}: {
  orgSlug: string;
  notifications: NotificationItem[];
}) {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <Link
        href={`/d/${orgSlug}`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted transition hover:text-foreground"
        title="Notifications"
        aria-label={`${unread} unread notifications`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    </div>
  );
}

export function StaffNotificationsPanel({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  if (notifications.length === 0) return null;

  return (
    <div className="border-b border-border bg-white px-3 py-4">
      <h2 className="text-section-title">Notifications</h2>
      <ul className="mt-2 divide-y divide-border">
        {notifications.slice(0, 8).map((n) => (
          <li key={n.id} className="py-2">
            <p
              className={`text-sm font-medium ${n.read ? "text-muted" : "text-foreground"}`}
            >
              {n.title}
            </p>
            <p className="text-list-meta text-xs">{n.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
