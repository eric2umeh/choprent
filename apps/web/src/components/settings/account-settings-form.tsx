"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  changePassword,
  updateOrgProfile,
  type OrgSettingsActionState,
} from "@/lib/actions/org-settings";
import type { OrgProfile } from "@/lib/data/org-profile";
import { FormPanel } from "@/components/ui/form-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";

const initial: OrgSettingsActionState = {};

export function ProfileSettingsForm({
  orgSlug,
  profile,
  userEmail,
  canEdit,
  onSaved,
}: {
  orgSlug: string;
  profile: OrgProfile;
  userEmail: string | null;
  canEdit: boolean;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateOrgProfile.bind(null, orgSlug),
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
      toast.success("Profile updated.");
      router.refresh();
      onSaved?.();
    }
  }, [state.error, state.success, onSaved, router]);

  return (
    <FormPanel>
      <form action={formAction} className="space-y-4">
        {profile.logoPath && (
          <p className="text-form-hint">Logo uploaded — pick a new file to replace.</p>
        )}
        <div>
          <label className="text-label normal-case">Your name</label>
          <input
            name="owner_display_name"
            className="input-field mt-1.5"
            defaultValue={profile.ownerDisplayName ?? ""}
            disabled={!canEdit || pending}
          />
        </div>
        <div>
          <label className="text-label normal-case">Company name (optional)</label>
          <input
            name="company_name"
            className="input-field mt-1.5"
            defaultValue={profile.companyName ?? ""}
            placeholder="Chidi Properties Ltd"
            disabled={!canEdit || pending}
          />
        </div>
        <div>
          <label className="text-label normal-case">Company logo</label>
          <input
            name="logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1.5 block w-full text-sm"
            disabled={!canEdit || pending}
          />
        </div>
        <p className="text-form-hint">Sign-in email: {userEmail ?? "—"}</p>
        {canEdit && (
          <LoadingButton
            type="submit"
            loading={pending}
            className="btn-primary w-full py-2.5 sm:w-auto sm:px-6"
          >
            Save profile
          </LoadingButton>
        )}
      </form>
    </FormPanel>
  );
}

export function PasswordSettingsForm({
  orgSlug,
  onSaved,
}: {
  orgSlug: string;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    changePassword.bind(null, orgSlug),
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
      onSaved?.();
    }
  }, [state.error, state.success, onSaved]);

  return (
    <FormPanel>
      <form action={formAction} className="space-y-4">
        <div>
          <label className="text-label normal-case">New password</label>
          <input
            name="password"
            type="password"
            minLength={8}
            className="input-field mt-1.5"
            disabled={pending}
          />
        </div>
        <div>
          <label className="text-label normal-case">Confirm password</label>
          <input
            name="confirm_password"
            type="password"
            minLength={8}
            className="input-field mt-1.5"
            disabled={pending}
          />
        </div>
        <LoadingButton
          type="submit"
          loading={pending}
          className="btn-primary w-full py-2.5 sm:w-auto sm:px-6"
        >
          Update password
        </LoadingButton>
      </form>
    </FormPanel>
  );
}

/** @deprecated Use SettingsPageClient instead */
export function AccountSettingsForm(props: {
  orgSlug: string;
  profile: OrgProfile;
  userEmail: string | null;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-8">
      <ProfileSettingsForm {...props} />
      <PasswordSettingsForm orgSlug={props.orgSlug} />
    </div>
  );
}
