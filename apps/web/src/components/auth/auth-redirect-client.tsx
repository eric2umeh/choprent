"use client";

import { useEffect } from "react";
import { LoadingState } from "@/components/ui/loading-state";

/** Full navigation with history replace so Back cannot return to /login. */
export function AuthRedirectClient({ path }: { path: string }) {
  useEffect(() => {
    window.location.replace(path);
  }, [path]);

  return <LoadingState fullScreen label="Opening your dashboard…" />;
}
