import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  PASSWORD_RECOVERY_COOKIE,
  recoveryCookieOptions,
} from "@/lib/auth/recovery-cookie";
import { createClient } from "@/lib/supabase/server";

function recoveryRedirect(origin: string) {
  const response = NextResponse.redirect(`${origin}/auth/reset-password`);
  response.cookies.set(PASSWORD_RECOVERY_COOKIE, "1", recoveryCookieOptions);
  return response;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const authError = searchParams.get("error");
  const errorCode = searchParams.get("error_code");

  if (authError) {
    if (errorCode === "otp_expired") {
      return NextResponse.redirect(`${origin}/login?error=otp_expired`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const type = searchParams.get("type");
  const isRecovery = type === "recovery";
  const next = isRecovery
    ? "/auth/reset-password"
    : (searchParams.get("next") ?? "/auth/redirect");

  const tokenHash = searchParams.get("token_hash");
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) {
      if (type === "recovery") return recoveryRedirect(origin);
      return NextResponse.redirect(`${origin}${next}`);
    }
    const message = encodeURIComponent(error.message);
    return NextResponse.redirect(`${origin}/login?error=auth&message=${message}`);
  }

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (isRecovery) return recoveryRedirect(origin);
      return NextResponse.redirect(`${origin}${next}`);
    }
    const message = encodeURIComponent(error.message);
    return NextResponse.redirect(`${origin}/login?error=auth&message=${message}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
