import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export async function countUnreadNotifications(
  userId: string,
  orgId?: string
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (orgId) query = query.eq("organization_id", orgId);
  const { count } = await query;
  return count ?? 0;
}

export async function listNotificationsForUser(
  userId: string,
  orgId?: string
): Promise<NotificationItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .select("id, title, body, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (orgId) query = query.eq("organization_id", orgId);

  const { data } = await query;
  return (data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    createdAt: n.created_at.slice(0, 10),
    read: !!n.read_at,
  }));
}

/** Mark all unread notifications for this user (and org) as read. */
export async function markUnreadNotificationsAsRead(
  userId: string,
  orgId?: string
): Promise<number> {
  const admin = createAdminClient();
  let query = admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (orgId) query = query.eq("organization_id", orgId);

  const { data, error } = await query.select("id");
  if (error) {
    const supabase = await createClient();
    let userQuery = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    if (orgId) userQuery = userQuery.eq("organization_id", orgId);
    const { data: userData } = await userQuery.select("id");
    return userData?.length ?? 0;
  }
  return data?.length ?? 0;
}
