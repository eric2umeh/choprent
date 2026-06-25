import { Card } from "@/components/ui/card";
import type { NotificationItem } from "@/lib/data/notifications";

export function TenantNotificationsList({
  notifications,
}: {
  notifications: NotificationItem[];
}) {
  if (notifications.length === 0) return null;

  return (
    <Card className="rounded-none border-x-0 border-t-0 shadow-none">
      <h2 className="text-section-title">Notifications</h2>
      <ul className="mt-2 divide-y divide-border">
        {notifications.map((n) => (
          <li key={n.id} className="py-2">
            <p className={`text-sm font-medium ${n.read ? "text-muted" : "text-foreground"}`}>
              {n.title}
            </p>
            <p className="text-list-meta text-xs">{n.body}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
