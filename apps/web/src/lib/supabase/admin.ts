import { createClient } from "@supabase/supabase-js";

/** Server-only Supabase client — bypasses RLS. Never import in client components. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY — add it to apps/web/.env.local (server only)."
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const PILOT_ORG_ID = "11111111-1111-1111-1111-111111111111";
export const PILOT_SITE_ID = "22222222-2222-2222-2222-222222222222";
export const PILOT_ORG_SLUG = "pilot-plaza";
