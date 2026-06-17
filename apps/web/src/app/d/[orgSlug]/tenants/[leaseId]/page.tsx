import { PageHeader } from "@/components/ui/page-header";
import { TenantDetailClient } from "@/components/tenants/tenant-detail-client";
import { requireStaffContext } from "@/lib/auth/session";
import { getLeaseDetail } from "@/lib/data/leases";
import { listExpensesForUnit } from "@/lib/data/expenses";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; leaseId: string }>;
}) {
  const { orgSlug, leaseId } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const lease = await getLeaseDetail(ctx.org.id, leaseId);
  if (!lease) notFound();

  const unitExpenses = await listExpensesForUnit(ctx.org.id, lease.unitId);

  return (
    <div>
      <PageHeader
        title={lease.tenantName}
        description={`Unit ${lease.unitCode} · ${lease.propertyName}`}
        action={
          <Link href={`/d/${orgSlug}/tenants`} className="btn-ghost px-3 py-1.5">
            ← All tenants
          </Link>
        }
      />
      <TenantDetailClient orgSlug={orgSlug} lease={lease} unitExpenses={unitExpenses} />
    </div>
  );
}
