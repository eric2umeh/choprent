import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";
import { requireStaffContext } from "@/lib/auth/session";
import { getOrgProfile } from "@/lib/data/org-profile";
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

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your account profile and password"
      />
      <Card className="rounded-none border-x-0 border-t-0 shadow-none">
        <AccountSettingsForm
          orgSlug={orgSlug}
          profile={profile}
          userEmail={ctx.user.email}
          canEdit={ctx.role === "owner"}
        />
      </Card>
    </div>
  );
}
