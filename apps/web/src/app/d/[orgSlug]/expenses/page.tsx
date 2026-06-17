import { PageHeader } from "@/components/ui/page-header";
import { ExpensesPageClient } from "@/components/expenses/expenses-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { canManageExpenses } from "@/lib/auth/roles";
import { getPropertyPnL, listExpensesForOrg } from "@/lib/data/expenses";
import { listPropertiesForOrg } from "@/lib/data/sites";

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);

  const [expenses, pnl, properties] = await Promise.all([
    listExpensesForOrg(ctx.org.id),
    getPropertyPnL(ctx.org.id),
    listPropertiesForOrg(ctx.org.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track property costs alongside rent collected"
      />
      <ExpensesPageClient
        orgSlug={orgSlug}
        expenses={expenses}
        pnl={pnl}
        properties={properties}
        canManage={canManageExpenses(ctx.role)}
      />
    </div>
  );
}
