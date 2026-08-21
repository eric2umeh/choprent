import { PageHeader } from "@/components/ui/page-header";
import { TenantDetailClient } from "@/components/tenants/tenant-detail-client";
import { requireStaffContext } from "@/lib/auth/session";
import { canManageDocumentFolders, canManageLeases } from "@/lib/auth/roles";
import { getLeaseDetail } from "@/lib/data/leases";
import { listExpensesForUnit } from "@/lib/data/expenses";
import { listDocumentsForTenant } from "@/lib/data/documents";
import { listDocumentFoldersForLease } from "@/lib/data/document-folders";
import { listSettlementAccounts } from "@/lib/data/settlement-accounts";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; leaseId: string }>;
}) {
  const { orgSlug, leaseId } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const canManage = canManageLeases(ctx.role);
  const canManageFolders = canManageDocumentFolders(ctx.role);
  const lease = await getLeaseDetail(ctx.org.id, leaseId);
  if (!lease) notFound();

  const [unitExpenses, settlementAccounts, documents, folders] =
    await Promise.all([
      listExpensesForUnit(ctx.org.id, lease.unitId),
      listSettlementAccounts(ctx.org.id),
      listDocumentsForTenant(ctx.org.id, lease.unitId, leaseId),
      listDocumentFoldersForLease(ctx.org.id, leaseId),
    ]);

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
      <TenantDetailClient
        orgSlug={orgSlug}
        lease={lease}
        unitExpenses={unitExpenses}
        documents={documents}
        folders={folders}
        canManage={canManage}
        canManageFolders={canManageFolders}
        settlementAccounts={settlementAccounts}
      />
    </div>
  );
}
