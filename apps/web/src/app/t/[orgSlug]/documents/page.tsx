import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentsList } from "@/components/documents/documents-list";

export default function TenantDocumentsPage() {
  return (
    <div>
      <PageHeader
        title="Documents"
        description="Statements and letters from management"
      />
      <Suspense fallback={<div className="px-3 py-8 text-cell-muted">Loading…</div>}>
        <DocumentsList tenantOnly />
      </Suspense>
    </div>
  );
}
