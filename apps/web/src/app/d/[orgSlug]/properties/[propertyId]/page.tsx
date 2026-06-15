import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { UnitsList } from "@/components/units/units-list";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits } from "@/lib/auth/roles";
import { getPropertyForOrg } from "@/lib/data/sites";
import { listUnitsForOrg } from "@/lib/data/units";
import { formatSiteType } from "@/lib/data/property-types";

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
    <div>
      <PageHeader
        title={property.name}
        description={`${formatSiteType(property.siteType)} · ${units.length} units`}
        action={
          <div className="flex gap-2">
            <Link href={`/d/${orgSlug}/properties`} className="btn-ghost px-3 py-1.5">
              ← All properties
            </Link>
            {canAddUnits(ctx.role) && (
              <Link
                href={`/d/${orgSlug}/properties/${propertyId}/units/new`}
                className="btn-primary px-3 py-1.5"
              >
                Add unit
              </Link>
            )}
          </div>
        }
      />
      <UnitsList
        orgSlug={orgSlug}
        propertyId={propertyId}
        canAdd={canAddUnits(ctx.role)}
        units={units}
      />
    </div>
  );
}
