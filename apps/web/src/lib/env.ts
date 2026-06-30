/** Always use real Supabase data when authenticated. */
export function isDemoMode(): boolean {
  return false;
}

/** Public app origin — used in auth emails, reminders, webhooks. */
export function appUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  // Vercel sets this automatically; avoids reset links pointing at localhost in prod.
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
