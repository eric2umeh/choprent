import { PropertiesPageClient } from "@/components/properties/properties-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits } from "@/lib/auth/roles";
import { listPropertiesForOrg } from "@/lib/data/sites";
import { listUnitsForOrg } from "@/lib/data/units";

export default async function PropertiesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const properties = await listPropertiesForOrg(ctx.org.id);
  const singleProperty = properties.length === 1 ? properties[0] : null;
  const units = singleProperty
    ? await listUnitsForOrg(ctx.org.id, singleProperty.id)
    : [];

  return (
    <PropertiesPageClient
      orgSlug={orgSlug}
      properties={properties}
      canManage={canAddUnits(ctx.role)}
      singleProperty={singleProperty}
      units={units}
    />
  );
}
