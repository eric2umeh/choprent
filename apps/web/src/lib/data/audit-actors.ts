import { createAdminClient } from "@/lib/supabase/admin";

function nameFromAuthUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string | null {
  const meta = user.user_metadata ?? {};
  for (const key of ["full_name", "name", "display_name"]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  if (user.email?.trim()) return user.email.trim();
  return null;
}

/** Resolve user ids to display labels (membership name, then auth profile/email). */
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
  await Promise.all(
    missing.map(async (id) => {
      try {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (error || !data.user) {
          labels.set(id, "Unknown user");
          return;
        }
        labels.set(id, nameFromAuthUser(data.user) ?? "Unknown user");
      } catch {
        labels.set(id, "Unknown user");
      }
    })
  );

  return labels;
}

export function actorLabel(
  labels: Map<string, string>,
  userId: string | null | undefined
): string | null {
  if (!userId) return null;
  return labels.get(userId) ?? null;
}
