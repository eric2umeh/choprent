import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/auth/redirect";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    const message = encodeURIComponent(error.message);
    return NextResponse.redirect(`${origin}/login?error=auth&message=${message}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
