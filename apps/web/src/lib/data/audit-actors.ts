import { createAdminClient } from "@/lib/supabase/admin";

/** Resolve user ids to display labels (membership name, then email). */
export async function resolveActorLabels(
  orgId: string,
  userIds: (string | null | undefined)[]
): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))];
  const labels = new Map<string, string>();
  if (ids.length === 0) return labels;

  const admin = createAdminClient();

  const { data: memberships } = await admin
    .from("memberships")
    .select("user_id, display_name")
    .eq("organization_id", orgId)
    .in("user_id", ids);

  for (const row of memberships ?? []) {
    if (row.display_name?.trim()) {
      labels.set(row.user_id, row.display_name.trim());
    }
  }

  const missing = ids.filter((id) => !labels.has(id));
  if (missing.length > 0) {
    const { data: usersPage } = await admin.auth.admin.listUsers();
    for (const user of usersPage.users) {
      if (!missing.includes(user.id)) continue;
      if (user.email) {
        labels.set(user.id, user.email);
      }
    }
  }

  for (const id of ids) {
    if (!labels.has(id)) {
      labels.set(id, "Unknown user");
    }
  }

  return labels;
}

export function actorLabel(
  labels: Map<string, string>,
  userId: string | null | undefined
): string | null {
  if (!userId) return null;
  return labels.get(userId) ?? null;
}
