"use server";

import { appUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";

export type PasswordResetActionState = {
  error?: string;
  success?: boolean;
  /** Present in dev when Resend did not deliver — use this link directly. */
  devResetUrl?: string;
  emailSent?: boolean;
};

function resetEmailHtml(resetUrl: string): string {
  return `
    <p>You requested a password reset for your ChopRent account.</p>
    <p><a href="${resetUrl}">Set a new password</a></p>
    <p>This link expires in about an hour. If you did not request this, you can ignore this email.</p>
    <p style="color:#666;font-size:12px">If the button does not work, copy this link:<br>${resetUrl}</p>
  `;
}

/** Send recovery email with token_hash link (no PKCE — works in any browser). */
export async function requestPasswordReset(
  email: string
): Promise<PasswordResetActionState> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { error: "Enter your email address." };

  try {
    const admin = createAdminClient();
    const origin = appUrl();

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: trimmed,
      options: { redirectTo: `${origin}/auth/reset-password` },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("user not found") || msg.includes("not registered")) {
        return { success: true };
      }
      return { error: error.message };
    }

    if (!data?.properties?.hashed_token) {
      return { error: "Could not create reset link. Try again later." };
    }

    const resetUrl = `${origin}/auth/reset-password/verify?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery`;

    const sent = await sendEmail({
      to: trimmed,
      subject: "Reset your ChopRent password",
      html: resetEmailHtml(resetUrl),
    });

    if (sent.ok) {
      return { success: true, emailSent: true };
    }

    if (process.env.NODE_ENV === "development") {
      console.warn("[password-reset] Resend failed:", sent.error);
      console.info("[password-reset:dev link]", resetUrl);
      return { success: true, emailSent: false, devResetUrl: resetUrl };
    }

    return { error: sent.error ?? "Could not send reset email." };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[password-reset]", err);
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not send reset email. Contact support.",
    };
  }
}
