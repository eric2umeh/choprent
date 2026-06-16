import { Suspense } from "react";
import { ListLoadingFallback } from "@/components/ui/list-loading-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { LeasesList } from "@/components/leases/leases-list";
import { requireStaffContext } from "@/lib/auth/session";
import { canManageLeases } from "@/lib/auth/roles";
import { listLeasesForOrg, listVacantUnitsForLease } from "@/lib/data/leases";
import { listSettlementAccounts } from "@/lib/data/settlement-accounts";

export default async function TenantsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const canManage = canManageLeases(ctx.role);

  const [leases, vacantUnits, settlementAccounts] = await Promise.all([
    listLeasesForOrg(ctx.org.id),
    listVacantUnitsForLease(ctx.org.id),
    listSettlementAccounts(ctx.org.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Active tenancies, contacts, and renewals"
      />
      <Suspense fallback={<ListLoadingFallback />}>
        <LeasesList
          orgSlug={orgSlug}
          leases={leases}
          vacantUnits={vacantUnits}
          settlementAccounts={settlementAccounts}
          canManage={canManage}
        />
      </Suspense>
    </div>
  );
}
