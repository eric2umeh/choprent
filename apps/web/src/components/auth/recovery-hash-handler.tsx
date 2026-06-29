"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Supabase recovery emails sometimes land on /login with tokens in the URL hash.
 * Middleware cannot read the hash — move recovery flows to /auth/reset-password.
 */
export function RecoveryHashHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const type = params.get("type");
    const accessToken = params.get("access_token");

    if (type !== "recovery" && !accessToken) return;

    if (pathname !== "/auth/reset-password") {
      router.replace(`/auth/reset-password${window.location.hash}`);
      return;
    }

    const supabase = createClient();
    void supabase.auth.getSession();
  }, [pathname, router]);

  return null;
}
