"use client";

import { useFormStatus } from "react-dom";
import { LoadingButton } from "@/components/ui/loading-button";

export function SignOutButton() {
  const { pending } = useFormStatus();

  return (
    <LoadingButton
      type="submit"
      loading={pending}
      loadingLabel="Signing out…"
      className="btn-ghost w-full py-2 text-xs disabled:opacity-60"
    >
      Sign out
    </LoadingButton>
  );
}
