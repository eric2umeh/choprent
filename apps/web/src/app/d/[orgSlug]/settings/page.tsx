import { PageHeader } from "@/components/ui/page-header";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { getOrgProfile } from "@/lib/data/org-profile";
import { listTeamMembers } from "@/lib/actions/team";
import { notFound } from "next/navigation";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const profile = await getOrgProfile(ctx.org.id);
  if (!profile) notFound();

  const teamMembers =
    ctx.role === "owner" ? await listTeamMembers(orgSlug) : [];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your account profile, team, and password"
      />
      <SettingsPageClient
        orgSlug={orgSlug}
        profile={profile}
        userEmail={ctx.user.email}
        canEditProfile={ctx.role === "owner"}
        teamMembers={teamMembers}
        showTeam={ctx.role === "owner"}
      />
    </div>
  );
}
