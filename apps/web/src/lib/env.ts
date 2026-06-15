/** Always use real Supabase data when authenticated. */
export function isDemoMode(): boolean {
  return false;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
