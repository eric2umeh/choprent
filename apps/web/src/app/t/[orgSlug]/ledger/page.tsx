import { Suspense } from "react";
import { ListLoadingFallback } from "@/components/ui/list-loading-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { TenantLedgerList } from "@/components/tenant/tenant-ledger-list";
import { requireTenantContext } from "@/lib/auth/session";
import { getTenantLedger } from "@/lib/data/ledger";

export default async function TenantLedgerPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireTenantContext(orgSlug);

  const { lines, balance } = await getTenantLedger(ctx.org.id, ctx.unitId);

  return (
    <div>
      <PageHeader
        title="Ledger"
        description="Charges, payments, and running balance"
      />
      <Suspense fallback={<ListLoadingFallback />}>
        <TenantLedgerList balance={balance} lines={lines} />
      </Suspense>
    </div>
  );
}
