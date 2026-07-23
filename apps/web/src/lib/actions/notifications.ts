"use server";

import { revalidatePath } from "next/cache";
import { requireStaffContext } from "@/lib/auth/session";
import { markUnreadNotificationsAsRead } from "@/lib/data/notifications";

/** Called when staff open the dashboard — clears the nav unread badge. */
export async function markDashboardNotificationsRead(
  orgSlug: string
): Promise<{ cleared: number }> {
  const ctx = await requireStaffContext(orgSlug);
  const cleared = await markUnreadNotificationsAsRead(ctx.user.id, ctx.org.id);
  if (cleared > 0) {
    revalidatePath(`/d/${orgSlug}`);
  }
  return { cleared };
}
