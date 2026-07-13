import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { UnitDetailClient } from "@/components/units/unit-detail-client";
import { UnitHistorySections } from "@/components/units/unit-history-sections";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits, canEditUnits, canManageLeases } from "@/lib/auth/roles";
import { resolveProperty } from "@/lib/data/sites";
import { resolveUnit } from "@/lib/data/units";
import { getUnitHistory } from "@/lib/data/leases";
import { listExpensesForUnit } from "@/lib/data/expenses";
import { listDocumentsForUnit } from "@/lib/data/documents";
import { propertyPath, unitPath, unitCodeFromUrlRef } from "@/lib/routes/dashboard-paths";
import { formatNaira } from "@/lib/auth/roles";
import { formatDisplayDate } from "@/lib/utils/format-date";
import { formatPropertyType } from "@/lib/data/unit-types";
import { isPaystackDvaEnabled } from "@/lib/paystack/client";
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
  const paystackDvaEnabled = isPaystackDvaEnabled();

  const canManageDocs = canManageLeases(ctx.role);

  const [history, expenses, documents] = await Promise.all([
    getUnitHistory(ctx.org.id, unit.id),
    listExpensesForUnit(ctx.org.id, unit.id),
    listDocumentsForUnit(ctx.org.id, unit.id),
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
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-label normal-case">Tenant</dt>
                <dd className="text-detail-value">{unit.tenantName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-label normal-case">Annual rent</dt>
                <dd className="text-detail-value">
                  {unit.annualRent > 0 ? formatNaira(unit.annualRent) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-label normal-case">Arrears</dt>
                <dd
                  className={
                    unit.arrears > 0 ? "text-detail-value text-money-negative" : "text-detail-value"
                  }
                >
                  {formatNaira(unit.arrears)}
                </dd>
              </div>
              {(unit.createdAt || unit.createdByName) && (
                <div>
                  <dt className="text-label normal-case">Unit added</dt>
                  <dd className="text-detail-value">
                    {unit.createdAt ? formatDisplayDate(unit.createdAt) : "—"}
                    {unit.createdByName ? (
                      <span className="text-detail-meta"> · {unit.createdByName}</span>
                    ) : null}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {paystackDvaEnabled && unit.virtualAccount && (
            <Card className="rounded-none border-x-0 border-t-0 border-border bg-surface-subtle shadow-none">
              <p className="text-label normal-case">Shop account (DVA)</p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">
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
          documents={documents}
          canManageDocuments={canManageDocs}
          unitId={unit.id}
        />
      </UnitDetailClient>
    </div>
  );
}
