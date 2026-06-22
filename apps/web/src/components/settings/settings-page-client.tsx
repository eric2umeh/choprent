"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { SettingsSectionCard } from "@/components/ui/form-panel";
import {
  ProfileSettingsForm,
  PasswordSettingsForm,
} from "@/components/settings/account-settings-form";
import { KeyRound, LogOut, UserRound } from "lucide-react";
import { StaffDisplayNameForm, ResignationForm } from "@/components/settings/staff-settings-form";
import type { OrgProfile } from "@/lib/data/org-profile";

export function SettingsPageClient({
  orgSlug,
  profile,
  userEmail,
  canEditProfile,
  staffDisplayName,
  staffRole,
}: {
  orgSlug: string;
  profile: OrgProfile;
  userEmail: string | null;
  canEditProfile: boolean;
  staffDisplayName?: string | null;
  staffRole?: "manager" | "agent" | null;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [staffNameOpen, setStaffNameOpen] = useState(false);
  const [resignationOpen, setResignationOpen] = useState(false);
  const isStaff = staffRole === "manager" || staffRole === "agent";

  return (
    <div className="space-y-4 px-3 py-4 lg:px-0">
      {canEditProfile ? (
        <SettingsSectionCard
          title="Profile"
          description="Company name, logo, and your display name — visible to tenants and staff."
          action={
            <button
              type="button"
              className="btn-ghost inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5"
              onClick={() => setProfileOpen(true)}
            >
              <UserRound className="h-4 w-4" />
              Edit profile
            </button>
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
      ) : isStaff ? (
        <SettingsSectionCard
          title="Your name"
          description="How your landlord and tenants see you on this team."
          action={
            <button
              type="button"
              className="btn-ghost inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5"
              onClick={() => setStaffNameOpen(true)}
            >
              <UserRound className="h-4 w-4" />
              Edit name
            </button>
          }
        >
          <p className="text-list-primary">{staffDisplayName || "—"}</p>
          <p className="mt-1 text-list-meta">Sign-in: {userEmail ?? "—"}</p>
        </SettingsSectionCard>
      ) : null}

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

      {isStaff && (
        <SettingsSectionCard
          title="Leave this team"
          description="Request to resign. Your landlord must accept before access is removed."
          action={
            <button
              type="button"
              className="btn-ghost inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-red-600"
              onClick={() => setResignationOpen(true)}
            >
              <LogOut className="h-4 w-4" />
              Request resignation
            </button>
          }
        />
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
        open={staffNameOpen}
        onClose={() => setStaffNameOpen(false)}
        title="Edit your name"
        description="This name is shown to your landlord and tenants."
      >
        <StaffDisplayNameForm
          orgSlug={orgSlug}
          displayName={staffDisplayName ?? ""}
          onSaved={() => setStaffNameOpen(false)}
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
        open={resignationOpen}
        onClose={() => setResignationOpen(false)}
        title="Request resignation"
        description="Your landlord will review before your access is removed."
      >
        <ResignationForm orgSlug={orgSlug} onSaved={() => setResignationOpen(false)} />
      </Modal>
    </div>
  );
}
