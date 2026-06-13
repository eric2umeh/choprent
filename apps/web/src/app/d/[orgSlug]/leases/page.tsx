import { Suspense } from "react";
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
      <Suspense fallback={<div className="px-3 py-8 text-cell-muted">Loading…</div>}>
        <LeasesList canManage={canManage} />
      </Suspense>
    </div>
  );
}
