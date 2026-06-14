/** UI preview without Supabase auth — set NEXT_PUBLIC_DEMO_MODE=true */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
