"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  changeTenantPassword,
  type TenantAccountActionState,
} from "@/lib/actions/tenant-account";
import { PasswordInput } from "@/components/ui/password-input";
import { FormPanel } from "@/components/ui/form-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";
import { LogOut } from "lucide-react";

const initial: TenantAccountActionState = {};

export function TenantPasswordForm({
  orgSlug,
  autoFocus,
}: {
  orgSlug: string;
  autoFocus?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    changeTenantPassword.bind(null, orgSlug),
    initial
  );
  const lastError = useRef<string | undefined>(undefined);
  const lastSuccess = useRef(false);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      toast.error(state.error);
      lastError.current = state.error;
    }
    if (state.success && !lastSuccess.current) {
      lastSuccess.current = true;
      toast.success("Password updated.");
    }
  }, [state.error, state.success]);

  return (
    <FormPanel>
      <form action={formAction} className="space-y-4" id="change-password">
        <div>
          <label className="text-label normal-case">New password</label>
          <PasswordInput
            name="password"
            minLength={8}
            className="mt-1.5"
            disabled={pending}
            autoFocus={autoFocus}
            required
          />
        </div>
        <div>
          <label className="text-label normal-case">Confirm password</label>
          <PasswordInput
            name="confirm_password"
            minLength={8}
            className="mt-1.5"
            disabled={pending}
            required
          />
        </div>
        <LoadingButton
          type="submit"
          loading={pending}
          className="btn-primary w-full py-2.5"
        >
          Update password
        </LoadingButton>
      </form>
    </FormPanel>
  );
}

export function TenantSignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="btn-ghost inline-flex w-full items-center justify-center gap-2 py-2.5 text-red-600 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </form>
  );
}
