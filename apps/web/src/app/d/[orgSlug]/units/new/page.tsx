import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { NewUnitForm } from "@/components/units/new-unit-form";
import { PropertyForm } from "@/components/settings/property-form";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits } from "@/lib/auth/roles";
import { listPropertiesForOrg } from "@/lib/data/sites";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { MockRole } from "@/lib/mock/data";

export default async function NewUnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { orgSlug } = await params;
  const { role: roleParam } = await searchParams;
  const ctx = await requireStaffContext(orgSlug, roleParam as MockRole | undefined);

  if (!canAddUnits(ctx.role)) {
    redirect(`/d/${orgSlug}/units`);
  }

  const properties = await listPropertiesForOrg(ctx.org.id, ctx.demoMode);

  if (properties.length === 0 && !ctx.demoMode) {
    return (
      <div>
        <PageHeader
          title="Add a property first"
          description="Create at least one plaza, estate, or house before adding units"
          action={
            <Link href={`/d/${orgSlug}/units`} className="btn-ghost px-3 py-1.5">
              ← Back
            </Link>
          }
        />

        <Card className="rounded-none border-x-0 border-t-0 shadow-none">
          <PropertyForm
            orgSlug={orgSlug}
            property={null}
            redirectAfter={`/d/${orgSlug}/units/new`}
          />
          <p className="mt-4 text-[11px] text-muted">
            You can add more properties later in Settings.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Add unit"
        description="Create a shop, flat, or office inside one of your properties"
        action={
          <Link href={`/d/${orgSlug}/units`} className="btn-ghost px-3 py-1.5">
            ← Back
          </Link>
        }
      />

      <Card className="rounded-none border-x-0 border-t-0 shadow-none">
        <NewUnitForm orgSlug={orgSlug} properties={properties} />
        <p className="mt-4 text-[11px] text-muted">
          Rent charges are configured in leases (Sprint 2). Composite codes like 14/16
          are detected automatically.
        </p>
      </Card>
    </div>
  );
}
