import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { UnitDetailClient } from "@/components/units/unit-detail-client";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits } from "@/lib/auth/roles";
import { getUnitDetail } from "@/lib/data/units";
import { formatNaira } from "@/lib/auth/roles";
import { formatPropertyType } from "@/lib/data/unit-types";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PropertyUnitDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; propertyId: string; unitId: string }>;
}) {
  const { orgSlug, propertyId, unitId } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const unit = await getUnitDetail(unitId, ctx.org.id);
  if (!unit) notFound();
  if (unit.siteId !== propertyId) {
    const { redirect } = await import("next/navigation");
    redirect(`/d/${orgSlug}/properties/${unit.siteId}/units/${unitId}`);
  }

  const canManage = canAddUnits(ctx.role);

  return (
    <div>
      <PageHeader
        title={`Unit ${unit.unitCode}`}
        description={`${formatPropertyType(unit.propertyType)} · ${unit.propertyName ?? "Property"}`}
        action={
          <Link
            href={`/d/${orgSlug}/properties/${propertyId}`}
            className="btn-ghost px-3 py-1.5"
          >
            ← Back to units
          </Link>
        }
      />

      <UnitDetailClient
        orgSlug={orgSlug}
        propertyId={propertyId}
        unit={unit}
        canManage={canManage}
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
      </UnitDetailClient>
    </div>
  );
}
