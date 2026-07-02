import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  PASSWORD_RECOVERY_COOKIE,
  recoveryCookieOptions,
} from "@/lib/auth/recovery-cookie";
import { createClient } from "@/lib/supabase/server";

/** Verify recovery token_hash server-side (no PKCE) then open reset form. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "recovery";

  if (!tokenHash) {
    return NextResponse.redirect(`${origin}/auth/reset-password?error=missing_token`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/reset-password?error=${encodeURIComponent(error.message)}`
    );
  }

  const response = NextResponse.redirect(`${origin}/auth/reset-password`);
  response.cookies.set(PASSWORD_RECOVERY_COOKIE, "1", recoveryCookieOptions);
  return response;
}
