import { PageHeader } from "@/components/ui/page-header";
import { UsersPageClient } from "@/components/users/users-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/auth/roles";
import { listPropertiesForOrg } from "@/lib/data/sites";
import { listTeamMembers, listPendingResignations } from "@/lib/actions/team";
import { notFound, redirect } from "next/navigation";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);

  if (!canManageTeam(ctx.role)) {
    redirect(`/d/${orgSlug}/settings`);
  }

  const [members, properties, resignations] = await Promise.all([
    listTeamMembers(orgSlug),
    listPropertiesForOrg(ctx.org.id),
    listPendingResignations(orgSlug),
  ]);

  if (!members) notFound();

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="Manage staff access, roles, and permissions for your plaza"
      />
      <UsersPageClient
        orgSlug={orgSlug}
        members={members}
        properties={properties}
        resignations={resignations}
        canInviteAdmin={ctx.role === "owner"}
      />
    </div>
  );
}
