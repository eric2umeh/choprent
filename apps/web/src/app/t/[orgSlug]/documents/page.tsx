import { Suspense } from "react";
import { ListLoadingFallback } from "@/components/ui/list-loading-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentsList } from "@/components/documents/documents-list";
import { requireTenantContext } from "@/lib/auth/session";
import { listDocumentsForTenant } from "@/lib/data/documents";

export default async function TenantDocumentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireTenantContext(orgSlug);
  const documents = await listDocumentsForTenant(
    ctx.org.id,
    ctx.unitId,
    ctx.leaseId
  );

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Letters, receipts, and files from management"
      />
      <Suspense fallback={<ListLoadingFallback />}>
        <DocumentsList
          orgSlug={orgSlug}
          documents={documents}
          tenantOnly
        />
      </Suspense>
    </div>
  );
}
