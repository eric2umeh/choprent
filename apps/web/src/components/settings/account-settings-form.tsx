"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  changePassword,
  updateOrgProfile,
  type OrgSettingsActionState,
} from "@/lib/actions/org-settings";
import type { OrgProfile } from "@/lib/data/org-profile";
import { PasswordInput } from "@/components/ui/password-input";
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
      toast.success(
        state.newSlug
          ? `Workspace updated. Your URL is now /d/${state.newSlug}`
          : "Profile updated."
      );
      if (state.newSlug) {
        router.push(`/d/${state.newSlug}/settings`);
      } else {
        router.refresh();
      }
      onSaved?.();
    }
  }, [state.error, state.success, state.newSlug, onSaved, router]);

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
          <label className="text-label normal-case">Workspace / plaza name</label>
          <input
            name="workspace_name"
            className="input-field mt-1.5"
            defaultValue={profile.orgName ?? ""}
            placeholder="Befs Plaza"
            disabled={!canEdit || pending}
            required
          />
          <p className="mt-1 text-form-hint">
            Shown in the dashboard. Shared by owner, managers, agents, and tenants.
          </p>
        </div>
        <div>
          <label className="text-label normal-case">Workspace URL slug</label>
          <input
            name="workspace_slug"
            className="input-field mt-1.5 font-mono text-sm"
            defaultValue={profile.slug ?? orgSlug}
            placeholder="befs-plaza"
            disabled={!canEdit || pending}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Lowercase letters, numbers, and hyphens"
          />
          <p className="mt-1 text-form-hint">
            Staff: <code className="text-xs">/d/{profile.slug || orgSlug}</code>
            {" · "}
            Tenants: <code className="text-xs">/t/{profile.slug || orgSlug}</code>
            . Same slug for everyone in this plaza — not one per role.
          </p>
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
          <PasswordInput
            name="password"
            minLength={8}
            className="mt-1.5"
            disabled={pending}
          />
        </div>
        <div>
          <label className="text-label normal-case">Confirm password</label>
          <PasswordInput
            name="confirm_password"
            minLength={8}
            className="mt-1.5"
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
