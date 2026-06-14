import { Suspense } from "react";
import { ListLoadingFallback } from "@/components/ui/list-loading-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { UnitsList } from "@/components/units/units-list";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits } from "@/lib/auth/roles";
import { listUnitsForOrg } from "@/lib/data/units";
import type { MockRole } from "@/lib/mock/data";

export default async function UnitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { orgSlug } = await params;
  const { role: roleParam } = await searchParams;
  const ctx = await requireStaffContext(orgSlug, roleParam as MockRole | undefined);
  const units = await listUnitsForOrg(ctx.org.id, ctx.demoMode);

  return (
    <div>
      <PageHeader
        title="Units"
        description="Shops, flats, and offices in your plaza"
      />
      <Suspense fallback={<ListLoadingFallback />}>
        <UnitsList
          orgSlug={orgSlug}
          canAdd={canAddUnits(ctx.role)}
          units={units}
          demoMode={ctx.demoMode}
        />
      </Suspense>
    </div>
  );
}
