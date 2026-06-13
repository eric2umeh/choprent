import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { TenantLedgerList } from "@/components/tenant/tenant-ledger-list";
import { MOCK_TENANT_LEDGER } from "@/lib/mock/data";
import { Download } from "lucide-react";

export default function TenantLedgerPage() {
  const balance = MOCK_TENANT_LEDGER.reduce((s, l) => s + l.amount, 0);

  return (
    <div>
      <PageHeader
        title="Ledger"
        description="Charges, payments, and running balance"
        action={
          <button
            type="button"
            className="btn-ghost inline-flex gap-1.5 px-2.5 py-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Statement
          </button>
        }
      />
      <Suspense fallback={<div className="px-3 py-8 text-cell-muted">Loading…</div>}>
        <TenantLedgerList balance={balance} />
      </Suspense>
    </div>
  );
}
