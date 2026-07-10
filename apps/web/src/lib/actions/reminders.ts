"use server";

import { revalidatePath } from "next/cache";
import { requireStaffContext } from "@/lib/auth/session";
import { isPrivilegedRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReminderActionState = {
  error?: string;
  success?: boolean;
};

export type ReminderRule = {
  id: string;
  daysAfterDue: number;
  channel: "email" | "in_app" | "both";
  enabled: boolean;
};

export async function listReminderRules(orgSlug: string): Promise<ReminderRule[]> {
  const ctx = await requireStaffContext(orgSlug);
  if (!isPrivilegedRole(ctx.role)) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("reminder_rules")
    .select("id, days_after_due, channel, enabled")
    .eq("organization_id", ctx.org.id)
    .order("days_after_due");

  return (data ?? []).map((r) => ({
    id: r.id,
    daysAfterDue: r.days_after_due,
    channel: r.channel as ReminderRule["channel"],
    enabled: r.enabled,
  }));
}

export async function upsertReminderRule(
  orgSlug: string,
  _prev: ReminderActionState,
  formData: FormData
): Promise<ReminderActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!isPrivilegedRole(ctx.role)) {
    return { error: "Only the landlord can manage reminder rules." };
  }

  const days = Number(formData.get("days_after_due"));
  const channel = String(formData.get("channel") ?? "both");
  const enabled = formData.get("enabled") === "on";

  if (!Number.isFinite(days) || days < 0) {
    return { error: "Days after due must be zero or more." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("reminder_rules").upsert(
    {
      organization_id: ctx.org.id,
      days_after_due: days,
      channel,
      enabled,
    },
    { onConflict: "organization_id,days_after_due" }
  );

  if (error) return { error: error.message };

  revalidatePath(`/d/${orgSlug}/settings`);
  return { success: true };
}

export async function toggleReminderRule(
  orgSlug: string,
  ruleId: string,
  enabled: boolean
): Promise<ReminderActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (!isPrivilegedRole(ctx.role)) {
    return { error: "Only the landlord can manage reminder rules." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("reminder_rules")
    .update({ enabled })
    .eq("id", ruleId)
    .eq("organization_id", ctx.org.id);

  if (error) return { error: error.message };

  revalidatePath(`/d/${orgSlug}/settings`);
  return { success: true };
}
