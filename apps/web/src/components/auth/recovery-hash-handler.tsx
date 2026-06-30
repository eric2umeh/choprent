"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Send auth tokens from /login to the reset page (middleware cannot read URL hash). */
export function RecoveryHashHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname === "/auth/reset-password") return;

    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const hash = window.location.hash.replace(/^#/, "");

    if (code || tokenHash) {
      const q = new URLSearchParams();
      if (code) q.set("code", code);
      if (tokenHash) q.set("token_hash", tokenHash);
      if (type) q.set("type", type);
      router.replace(`/auth/reset-password?${q.toString()}`);
      return;
    }

    if (hash) {
      const params = new URLSearchParams(hash);
      if (params.get("access_token") || params.get("type") === "recovery") {
        router.replace(`/auth/reset-password${window.location.hash}`);
      }
    }
  }, [pathname, router, searchParams]);

  return null;
}
