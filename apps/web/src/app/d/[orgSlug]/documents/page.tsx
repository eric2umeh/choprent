import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentsList } from "@/components/documents/documents-list";

export default function DocumentsPage() {
  return (
    <div>
      <PageHeader
        title="Documents"
        description="Management letters, notices, statements, and receipts"
        action={
          <button type="button" className="btn-primary px-3 py-1.5">
            Issue letter (mock)
          </button>
        }
      />
      <Suspense fallback={<div className="px-3 py-8 text-cell-muted">Loading…</div>}>
        <DocumentsList />
      </Suspense>
    </div>
  );
}
