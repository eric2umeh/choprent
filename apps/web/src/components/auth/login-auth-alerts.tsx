"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatAuthError } from "@/lib/auth/messages";
import { toast } from "@/components/ui/toast";

const ERROR_MESSAGES: Record<string, string> = {
  no_access:
    "You're signed in, but your role isn't set up yet. Choose your role on the next screen to continue.",
  otp_expired:
    "Magic link expired or already used. Use the Password tab to sign in instead.",
  auth: "Sign-in failed. Try the Password tab, or request one new magic link.",
};

export function LoginAuthAlerts() {
  const searchParams = useSearchParams();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;

    const queryError = searchParams.get("error");
    if (queryError && ERROR_MESSAGES[queryError]) {
      toast.error(ERROR_MESSAGES[queryError]);
      setShown(true);
      return;
    }

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const code = params.get("error_code");
    const description = params.get("error_description");

    if (code === "otp_expired") {
      toast.error(ERROR_MESSAGES.otp_expired);
    } else if (description) {
      toast.error(formatAuthError(description.replace(/\+/g, " ")));
    } else if (params.get("error")) {
      toast.error(ERROR_MESSAGES.auth);
    }

    setShown(true);

    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
  }, [searchParams, shown]);

  return null;
}
