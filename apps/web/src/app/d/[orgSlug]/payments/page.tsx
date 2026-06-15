import { Suspense } from "react";
import { ListLoadingFallback } from "@/components/ui/list-loading-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentsList } from "@/components/payments/payments-list";
import { requireStaffContext } from "@/lib/auth/session";
import { canVerifyPayments } from "@/lib/auth/roles";
import { listPaymentsForOrg } from "@/lib/data/payments";
import { listUnitsForOrg } from "@/lib/data/units";

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const canVerify = canVerifyPayments(ctx.role);

  const [payments, units] = await Promise.all([
    listPaymentsForOrg(ctx.org.id),
    listUnitsForOrg(ctx.org.id),
  ]);

  const unitOptions = units.map((u) => ({ id: u.id, unitCode: u.unitCode }));

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Verify receipts and record cash"
      />
      <Suspense fallback={<ListLoadingFallback />}>
        <PaymentsList
          orgSlug={orgSlug}
          canVerify={canVerify}
          payments={payments}
          units={unitOptions}
        />
      </Suspense>
    </div>
  );
}
