"use server";

import { requireTenantContext } from "@/lib/auth/session";
import {
  MIN_PASSWORD_LENGTH,
  MIN_PASSWORD_MESSAGE,
} from "@/lib/auth/password-validation";
import { createClient } from "@/lib/supabase/server";

export type TenantAccountActionState = {
  error?: string;
  success?: boolean;
};

export async function changeTenantPassword(
  orgSlug: string,
  _prev: TenantAccountActionState,
  formData: FormData
): Promise<TenantAccountActionState> {
  await requireTenantContext(orgSlug);

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: MIN_PASSWORD_MESSAGE };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: true };
}
