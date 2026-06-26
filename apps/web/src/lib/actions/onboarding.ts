"use server";

import { revalidatePath } from "next/cache";
import { requireStaffContext } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export type OnboardingActionState = {
  error?: string;
  success?: boolean;
};

export async function dismissPilotOnboarding(
  orgSlug: string
): Promise<OnboardingActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") {
    return { error: "Only the landlord can dismiss the setup guide." };
  }

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("settings")
    .eq("id", ctx.org.id)
    .maybeSingle();

  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  settings.onboarding_dismissed = true;

  const { error } = await admin
    .from("organizations")
    .update({ settings })
    .eq("id", ctx.org.id);

  if (error) return { error: error.message };

  revalidatePath(`/d/${orgSlug}`);
  return { success: true };
}

export async function reopenPilotOnboarding(
  orgSlug: string
): Promise<OnboardingActionState> {
  const ctx = await requireStaffContext(orgSlug);
  if (ctx.role !== "owner") {
    return { error: "Only the landlord can reopen the setup guide." };
  }

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("settings")
    .eq("id", ctx.org.id)
    .maybeSingle();

  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  delete settings.onboarding_dismissed;

  const { error } = await admin
    .from("organizations")
    .update({ settings })
    .eq("id", ctx.org.id);

  if (error) return { error: error.message };

  revalidatePath(`/d/${orgSlug}`);
  revalidatePath(`/d/${orgSlug}/settings`);
  return { success: true };
}
