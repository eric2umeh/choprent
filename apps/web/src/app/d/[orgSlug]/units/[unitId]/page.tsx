import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { requireStaffContext } from "@/lib/auth/session";
import { getUnitDetail } from "@/lib/data/units";
import { formatNaira } from "@/lib/auth/roles";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { MockRole } from "@/lib/mock/data";

export default async function UnitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; unitId: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { orgSlug, unitId } = await params;
  const { role: roleParam } = await searchParams;
  const ctx = await requireStaffContext(orgSlug, roleParam as MockRole | undefined);
  const unit = await getUnitDetail(unitId, ctx.org.id, ctx.demoMode);
  if (!unit) notFound();

  return (
    <div>
      <PageHeader
        title={`Unit ${unit.unitCode}`}
        description={`${unit.propertyType} · ${unit.status}`}
        action={
          <Link href={`/d/${orgSlug}/units`} className="btn-ghost px-3 py-1.5">
            ← Back
          </Link>
        }
      />

      <div className="space-y-0">
        <Card className="rounded-none border-x-0 border-t-0 shadow-none">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-label normal-case">Tenant</dt>
              <dd className="mt-0.5 font-medium">{unit.tenantName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-label normal-case">Annual rent</dt>
              <dd className="mt-0.5 font-medium">
                {unit.annualRent > 0 ? formatNaira(unit.annualRent) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-label normal-case">Arrears</dt>
              <dd
                className={`mt-0.5 font-medium ${
                  unit.arrears > 0 ? "text-red-600" : "text-green-700"
                }`}
              >
                {formatNaira(unit.arrears)}
              </dd>
            </div>
            {unit.isComposite && unit.compositeNote && (
              <div className="sm:col-span-2">
                <dt className="text-label normal-case">Composite note</dt>
                <dd className="mt-0.5 text-cell-muted">{unit.compositeNote}</dd>
              </div>
            )}
          </dl>
        </Card>

        {unit.virtualAccount && (
          <Card className="rounded-none border-x-0 border-t-0 border-green-200 bg-green-50 shadow-none">
            <p className="text-label normal-case text-green-800">Shop account (DVA)</p>
            <p className="mt-1 font-mono text-lg font-bold">{unit.virtualAccount}</p>
            <button type="button" className="btn-primary mt-3 px-3 py-1.5">
              Copy NUBAN
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
