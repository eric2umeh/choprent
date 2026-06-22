import { PageHeader } from "@/components/ui/page-header";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { getOrgProfile } from "@/lib/data/org-profile";
import { createAdminClient } from "@/lib/supabase/admin";
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

  let staffDisplayName: string | null = null;
  if (ctx.role === "manager" || ctx.role === "agent") {
    const admin = createAdminClient();
    const { data } = await admin
      .from("memberships")
      .select("display_name")
      .eq("organization_id", ctx.org.id)
      .eq("user_id", ctx.user.id)
      .maybeSingle();
    staffDisplayName = data?.display_name ?? null;
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your account profile and password"
      />
      <SettingsPageClient
        orgSlug={orgSlug}
        profile={profile}
        userEmail={ctx.user.email}
        canEditProfile={ctx.role === "owner"}
        staffDisplayName={staffDisplayName}
        staffRole={ctx.role === "manager" || ctx.role === "agent" ? ctx.role : null}
      />
    </div>
  );
}
