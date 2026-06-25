import { createClient } from "@/lib/supabase/server";

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
