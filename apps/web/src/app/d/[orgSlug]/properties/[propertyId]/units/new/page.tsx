import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { NewUnitForm } from "@/components/units/new-unit-form";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits } from "@/lib/auth/roles";
import { getPropertyForOrg } from "@/lib/data/sites";

export default async function NewPropertyUnitPage({
  params,
}: {
  params: Promise<{ orgSlug: string; propertyId: string }>;
}) {
  const { orgSlug, propertyId } = await params;
  const ctx = await requireStaffContext(orgSlug);

  if (!canAddUnits(ctx.role)) {
    redirect(`/d/${orgSlug}/properties/${propertyId}`);
  }

  const property = await getPropertyForOrg(ctx.org.id, propertyId);
  if (!property) notFound();

  return (
    <div>
      <PageHeader
        title="Add unit"
        description={`New shop, flat, or office in ${property.name}`}
        action={
          <Link
            href={`/d/${orgSlug}/properties/${propertyId}`}
            className="btn-ghost px-3 py-1.5"
          >
            ← Back
          </Link>
        }
      />
      <Card className="rounded-none border-x-0 border-t-0 shadow-none">
        <NewUnitForm
          orgSlug={orgSlug}
          propertyId={propertyId}
          propertyName={property.name}
        />
      </Card>
    </div>
  );
}
