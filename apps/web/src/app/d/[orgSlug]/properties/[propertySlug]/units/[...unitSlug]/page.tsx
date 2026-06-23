import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { UnitDetailClient } from "@/components/units/unit-detail-client";
import { UnitHistorySections } from "@/components/units/unit-history-sections";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits, canEditUnits } from "@/lib/auth/roles";
import { resolveProperty } from "@/lib/data/sites";
import { resolveUnit } from "@/lib/data/units";
import { getUnitHistory } from "@/lib/data/leases";
import { listExpensesForUnit } from "@/lib/data/expenses";
import { propertyPath, unitPath, unitCodeFromUrlRef } from "@/lib/routes/dashboard-paths";
import { formatNaira } from "@/lib/auth/roles";
import { formatPropertyType } from "@/lib/data/unit-types";
import { isUuid } from "@/lib/utils/slug";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function PropertyUnitDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; propertySlug: string; unitSlug: string[] }>;
}) {
  const { orgSlug, propertySlug: rawPropertySlug, unitSlug: unitSlugParts } =
    await params;
  const propertySlug = decodeURIComponent(rawPropertySlug);
  if (!unitSlugParts?.length) {
    redirect(propertyPath(orgSlug, propertySlug));
  }
  const unitRef = unitCodeFromUrlRef(unitSlugParts);
  const ctx = await requireStaffContext(orgSlug);
  const property = await resolveProperty(ctx.org.id, propertySlug);
  if (!property) notFound();

  if (isUuid(propertySlug)) {
    redirect(propertyPath(orgSlug, property.slug));
  }

  const unit = await resolveUnit(ctx.org.id, property.id, unitRef);
  if (!unit) notFound();

  if (unit.siteId !== property.id) {
    const actualProperty = await resolveProperty(ctx.org.id, unit.siteId);
    if (!actualProperty) notFound();
    redirect(unitPath(orgSlug, actualProperty.slug, unit.unitCode));
  }

  if (isUuid(unitRef)) {
    redirect(unitPath(orgSlug, property.slug, unit.unitCode));
  }

  if (propertySlug !== property.slug || unitRef !== unit.unitCode) {
    redirect(unitPath(orgSlug, property.slug, unit.unitCode));
  }

  const canEdit = canEditUnits(ctx.role);

  const [history, expenses] = await Promise.all([
    getUnitHistory(ctx.org.id, unit.id),
    listExpensesForUnit(ctx.org.id, unit.id),
  ]);

  return (
    <div>
      <PageHeader
        title={`Unit ${unit.unitCode}`}
        description={`${formatPropertyType(unit.propertyType)} · ${property.name}`}
        action={
          <Link
            href={propertyPath(orgSlug, property.slug)}
            className="btn-ghost px-3 py-1.5"
          >
            ← Back to units
          </Link>
        }
      />

      <UnitDetailClient
        orgSlug={orgSlug}
        propertyId={property.id}
        unit={unit}
        canEdit={canEdit}
        canDelete={canAddUnits(ctx.role)}
      >
        <div className="space-y-0">
          <Card className="rounded-none border-x-0 border-t-0 shadow-none">
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-label normal-case">Tenant</dt>
                <dd className="mt-0.5 text-list-primary font-semibold">
                  {unit.tenantName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-label normal-case">Annual rent</dt>
                <dd className="mt-0.5 text-money">
                  {unit.annualRent > 0 ? formatNaira(unit.annualRent) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-label normal-case">Arrears</dt>
                <dd
                  className={`mt-0.5 font-semibold ${
                    unit.arrears > 0 ? "text-money-negative" : "text-green-700"
                  }`}
                >
                  {formatNaira(unit.arrears)}
                </dd>
              </div>
            </dl>
          </Card>

          {unit.virtualAccount && (
            <Card className="rounded-none border-x-0 border-t-0 border-green-200 bg-green-50 shadow-none">
              <p className="text-label normal-case text-green-800">Shop account (DVA)</p>
              <p className="mt-1 font-mono text-lg font-bold text-green-900">
                {unit.virtualAccount}
              </p>
            </Card>
          )}
        </div>

        <UnitHistorySections
          orgSlug={orgSlug}
          payments={history.payments}
          leases={history.leases}
          expenses={expenses}
        />
      </UnitDetailClient>
    </div>
  );
}
