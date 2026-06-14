import { Suspense } from "react";
import { ListLoadingFallback } from "@/components/ui/list-loading-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentsList } from "@/components/documents/documents-list";

export default function TenantDocumentsPage() {
  return (
    <div>
      <PageHeader
        title="Documents"
        description="Statements and letters from management"
      />
      <Suspense fallback={<ListLoadingFallback />}>
        <DocumentsList tenantOnly />
      </Suspense>
    </div>
  );
}
