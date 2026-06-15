"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  changePassword,
  updateOrgProfile,
  type OrgSettingsActionState,
} from "@/lib/actions/org-settings";
import type { OrgProfile } from "@/lib/data/org-profile";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";

const initial: OrgSettingsActionState = {};

export function AccountSettingsForm({
  orgSlug,
  profile,
  userEmail,
  canEdit,
}: {
  orgSlug: string;
  profile: OrgProfile;
  userEmail: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [profileState, profileAction, profilePending] = useActionState(
    updateOrgProfile.bind(null, orgSlug),
    initial
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePassword.bind(null, orgSlug),
    initial
  );
  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    const err = profileState.error || passwordState.error;
    if (err && err !== lastError.current) {
      toast.error(err);
      lastError.current = err;
    }
    if (profileState.success) {
      toast.success("Profile updated.");
      router.refresh();
    }
    if (passwordState.success) {
      toast.success("Password updated.");
    }
  }, [profileState, passwordState, router]);

  return (
    <div className="space-y-8">
      <form action={profileAction} className="space-y-4">
        <h2 className="text-section-title">Profile</h2>
        <p className="text-list-meta">
          Tenants and staff see your company name and logo across the app.
        </p>
        {profile.logoPath && (
          <p className="text-list-secondary">Logo uploaded — save a new file to replace.</p>
        )}
        <div>
          <label className="text-label normal-case">Your name</label>
          <input
            name="owner_display_name"
            className="input-field mt-1"
            defaultValue={profile.ownerDisplayName ?? ""}
            disabled={!canEdit || profilePending}
          />
        </div>
        <div>
          <label className="text-label normal-case">Company name (optional)</label>
          <input
            name="company_name"
            className="input-field mt-1"
            defaultValue={profile.companyName ?? ""}
            placeholder="Chidi Properties Ltd"
            disabled={!canEdit || profilePending}
          />
        </div>
        <div>
          <label className="text-label normal-case">Company logo</label>
          <input
            name="logo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="input-field mt-1 file:mr-2 file:rounded file:border-0 file:bg-green-50 file:px-2 file:py-1 file:text-xs"
            disabled={!canEdit || profilePending}
          />
        </div>
        <p className="text-list-meta">Sign-in email: {userEmail ?? "—"}</p>
        {canEdit && (
          <LoadingButton type="submit" loading={profilePending} className="btn-primary px-4 py-2">
            Save profile
          </LoadingButton>
        )}
      </form>

      <form action={passwordAction} className="space-y-4 border-t border-border pt-6">
        <h2 className="text-section-title">Change password</h2>
        <div>
          <label className="text-label normal-case">New password</label>
          <input
            name="password"
            type="password"
            minLength={8}
            className="input-field mt-1"
            disabled={passwordPending}
          />
        </div>
        <div>
          <label className="text-label normal-case">Confirm password</label>
          <input
            name="confirm_password"
            type="password"
            minLength={8}
            className="input-field mt-1"
            disabled={passwordPending}
          />
        </div>
        <LoadingButton type="submit" loading={passwordPending} className="btn-primary px-4 py-2">
          Update password
        </LoadingButton>
      </form>
    </div>
  );
}
