import { PropertiesPageClient } from "@/components/properties/properties-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits } from "@/lib/auth/roles";
import { listPropertiesForOrg } from "@/lib/data/sites";

export default async function PropertiesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const properties = await listPropertiesForOrg(ctx.org.id);

  return (
    <PropertiesPageClient
      orgSlug={orgSlug}
      properties={properties}
      canManage={canAddUnits(ctx.role)}
    />
  );
}
