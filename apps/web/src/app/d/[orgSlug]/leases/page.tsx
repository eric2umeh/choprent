import { Suspense } from "react";
import { ListLoadingFallback } from "@/components/ui/list-loading-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { LeasesList } from "@/components/leases/leases-list";

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role = "owner" } = await searchParams;
  const canManage = role === "owner" || role === "manager";

  return (
    <div>
      <PageHeader
        title="Leases"
        description="Active tenancies and renewals"
      />
      <Suspense fallback={<ListLoadingFallback />}>
        <LeasesList canManage={canManage} />
      </Suspense>
    </div>
  );
}
