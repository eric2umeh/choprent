import { notFound } from "next/navigation";
import { PropertyDetailPageClient } from "@/components/properties/property-detail-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits } from "@/lib/auth/roles";
import { getPropertyForOrg } from "@/lib/data/sites";
import { listUnitsForOrg } from "@/lib/data/units";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; propertyId: string }>;
}) {
  const { orgSlug, propertyId } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const property = await getPropertyForOrg(ctx.org.id, propertyId);
  if (!property) notFound();

  const units = await listUnitsForOrg(ctx.org.id, propertyId);

  return (
    <PropertyDetailPageClient
      orgSlug={orgSlug}
      property={property}
      units={units}
      canManage={canAddUnits(ctx.role)}
    />
  );
}
