import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentsList } from "@/components/payments/payments-list";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role = "owner" } = await searchParams;
  const canVerify =
    role === "owner" || role === "manager" || role === "agent";

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Verify receipts and record cash"
      />
      <Suspense fallback={<div className="px-3 py-8 text-cell-muted">Loading…</div>}>
        <PaymentsList canVerify={canVerify} />
      </Suspense>
    </div>
  );
}
