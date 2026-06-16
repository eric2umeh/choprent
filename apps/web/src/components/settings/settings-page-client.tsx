"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SettingsSectionCard } from "@/components/ui/form-panel";
import {
  ProfileSettingsForm,
  PasswordSettingsForm,
} from "@/components/settings/account-settings-form";
import { TeamInviteForm, TeamMembersList } from "@/components/settings/team-panel";
import type { OrgProfile } from "@/lib/data/org-profile";
import type { TeamMember } from "@/lib/actions/team";
import { KeyRound, UserPlus, UserRound } from "lucide-react";

export function SettingsPageClient({
  orgSlug,
  profile,
  userEmail,
  canEditProfile,
  teamMembers,
  showTeam,
}: {
  orgSlug: string;
  profile: OrgProfile;
  userEmail: string | null;
  canEditProfile: boolean;
  teamMembers: TeamMember[];
  showTeam: boolean;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="space-y-4 px-3 py-4 lg:px-0">
      <SettingsSectionCard
        title="Profile"
        description="Company name, logo, and your display name — visible to tenants and staff."
        action={
          canEditProfile ? (
            <button
              type="button"
              className="btn-ghost inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5"
              onClick={() => setProfileOpen(true)}
            >
              <UserRound className="h-4 w-4" />
              Edit profile
            </button>
          ) : (
            <span className="text-list-meta text-sm">Owner only</span>
          )
        }
      >
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-label normal-case">Your name</dt>
            <dd className="mt-0.5 text-list-primary">
              {profile.ownerDisplayName || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-label normal-case">Company</dt>
            <dd className="mt-0.5 text-list-primary">
              {profile.companyName || "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-label normal-case">Sign-in email</dt>
            <dd className="mt-0.5 text-list-secondary">{userEmail ?? "—"}</dd>
          </div>
        </dl>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Password"
        description="Update your login password — minimum 8 characters."
        action={
          <button
            type="button"
            className="btn-ghost inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5"
            onClick={() => setPasswordOpen(true)}
          >
            <KeyRound className="h-4 w-4" />
            Change password
          </button>
        }
      />

      {showTeam && (
        <SettingsSectionCard
          title="Team"
          description="Managers run day-to-day ops. Agents verify payments on assigned sites."
          action={
            <button
              type="button"
              className="btn-primary inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5"
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              Invite member
            </button>
          }
        >
          <TeamMembersList orgSlug={orgSlug} members={teamMembers} />
        </SettingsSectionCard>
      )}

      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Edit profile"
        description="Tenants and staff see your company name and logo."
      >
        <ProfileSettingsForm
          orgSlug={orgSlug}
          profile={profile}
          userEmail={userEmail}
          canEdit={canEditProfile}
          onSaved={() => setProfileOpen(false)}
        />
      </Modal>

      <Modal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Change password"
        description="Choose a strong password you do not use elsewhere."
      >
        <PasswordSettingsForm
          orgSlug={orgSlug}
          onSaved={() => setPasswordOpen(false)}
        />
      </Modal>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite team member"
        description="They must sign up at /login first, then you add them by email."
      >
        <TeamInviteForm orgSlug={orgSlug} onSaved={() => setInviteOpen(false)} />
      </Modal>
    </div>
  );
}
