import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_PREFIXES = ["/", "/login", "/auth", "/access-pending", "/invite"];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`))
  );
}

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/d/") || pathname.startsWith("/t/");
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Never HTML-redirect Server Action POSTs — the client expects an RSC action
  // response. Auth redirects here cause "unexpected response from the server".
  const isServerAction =
    request.method === "POST" &&
    Boolean(
      request.headers.get("next-action") ?? request.headers.get("Next-Action")
    );

  if (pathname.startsWith("/d/pilot-plaza") || pathname.startsWith("/t/pilot-plaza")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace("/pilot-plaza", "/eri-plaza");
    return NextResponse.redirect(url);
  }

  if (isProtectedPath(pathname) && !user && !isServerAction) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && user) {
    const error = request.nextUrl.searchParams.get("error");
    const recoveryPending =
      request.cookies.get("password_recovery_pending")?.value === "1";
    if (recoveryPending) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/reset-password";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (!error) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/redirect";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/auth/redirect" && user) {
    const recoveryPending =
      request.cookies.get("password_recovery_pending")?.value === "1";
    if (recoveryPending) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/reset-password";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (!isPublicPath(pathname) && !isProtectedPath(pathname)) {
    return supabaseResponse;
  }

  return supabaseResponse;
}
