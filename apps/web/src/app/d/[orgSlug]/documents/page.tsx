import { Suspense } from "react";
import { ListLoadingFallback } from "@/components/ui/list-loading-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentsList } from "@/components/documents/documents-list";
import { requireStaffContext } from "@/lib/auth/session";
import { canManageLeases } from "@/lib/auth/roles";
import { listDocumentsForOrg } from "@/lib/data/documents";
import { listUnitsForOrg } from "@/lib/data/units";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const canManage = canManageLeases(ctx.role);

  const [documents, units] = await Promise.all([
    listDocumentsForOrg(ctx.org.id),
    listUnitsForOrg(ctx.org.id),
  ]);

  const unitOptions = units.map((u) => ({ id: u.id, unitCode: u.unitCode }));

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Management letters, notices, statements, and receipts"
      />
      <Suspense fallback={<ListLoadingFallback />}>
        <DocumentsList
          orgSlug={orgSlug}
          documents={documents}
          units={unitOptions}
          canManage={canManage}
        />
      </Suspense>
    </div>
  );
}
