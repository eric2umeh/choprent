/** Always use real Supabase data when authenticated. */
export function isDemoMode(): boolean {
  return false;
}

function isLocalhostOrigin(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
  }
}

/**
 * Public app origin — used in auth emails, tenant invites, reminders, webhooks.
 * On Vercel, never prefer a localhost NEXT_PUBLIC_APP_URL over the deployment URL.
 */
export function appUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "");

  if (configured && !isLocalhostOrigin(configured)) {
    return configured;
  }

  if (vercel) {
    return `https://${vercel}`;
  }

  if (configured) return configured;
  return "http://localhost:3000";
}
