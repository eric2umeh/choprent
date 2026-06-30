/** User-facing auth errors — hide raw Supabase messages where possible. */
export function formatAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many sign-in emails sent (Supabase email limit, often 2/hour). In Dashboard → Auth → Rate Limits, raise **Rate limit for sending emails**, save, wait up to an hour, or open /auth/redirect if you're already signed in.";
  }

  if (lower.includes("otp_expired") || lower.includes("invalid or has expired")) {
    return "Magic link expired. Use Password sign-in instead (no email limit).";
  }

  if (lower.includes("code challenge") || lower.includes("code verifier")) {
    return "This reset link was opened in a different browser. Request a new link on this device (login → Forgot password) and open that email here.";
  }

  if (lower.includes("invalid login credentials")) {
    return "Wrong email or password. Use Forgot password, or create an account with 6+ characters.";
  }

  if (lower.includes("signup is disabled")) {
    return "New sign-ups are disabled. Ask your plaza admin to invite you.";
  }

  return message;
}

export const MAGIC_LINK_COOLDOWN_SEC = 60;
