import { NextResponse } from "next/server";

/** Legacy recovery callback — forward tokens to reset page (client verifies). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const target = new URL(`${origin}/auth/reset-password`);

  for (const key of ["code", "token_hash", "type", "error", "error_description"]) {
    const v = searchParams.get(key);
    if (v) target.searchParams.set(key, v);
  }

  if (searchParams.get("error")) {
    target.searchParams.set("error", searchParams.get("error")!);
  }

  return NextResponse.redirect(target.toString());
}
