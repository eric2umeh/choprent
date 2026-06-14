import { Suspense } from "react";
import { ListLoadingFallback } from "@/components/ui/list-loading-fallback";
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
      <Suspense fallback={<ListLoadingFallback />}>
        <PaymentsList canVerify={canVerify} />
      </Suspense>
    </div>
  );
}
