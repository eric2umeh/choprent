import type { SupabaseClient } from "@supabase/supabase-js";

/** App-wide minimum password length (signup, reset, invite, settings). */
export const MIN_PASSWORD_LENGTH = 8;

export const MIN_PASSWORD_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

/** True when candidate matches the user's current password (via sign-in probe). */
export async function isSameAsCurrentPassword(
  supabase: SupabaseClient,
  email: string,
  candidatePassword: string
): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: candidatePassword,
  });
  return !error;
}

export const SAME_PASSWORD_MESSAGE =
  "Choose a password you haven't used before. Your new password must be different from your previous one.";
