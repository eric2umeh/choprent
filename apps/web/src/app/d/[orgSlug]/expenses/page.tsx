import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { requireStaffContext } from "@/lib/auth/session";

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireStaffContext(orgSlug);

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track property costs alongside rent collected"
      />

      <Card className="mx-3 mt-4 rounded-xl border-amber-200 bg-amber-50/60 p-4">
        <p className="text-sm font-semibold text-amber-950">Coming in a future sprint</p>
        <p className="mt-2 text-sm text-amber-900/90">
          Landlords and managers will record maintenance, diesel, security, agency,
          and other costs per property — with revenue vs expense views for
          management reporting.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-amber-900/80">
          <li>Add, edit, and delete expenses (manager + landlord roles)</li>
          <li>Category tags and receipt attachments</li>
          <li>Monthly P&amp;L per property and portfolio summary</li>
        </ul>
        <Link
          href={`/d/${orgSlug}/reports`}
          className="mt-4 inline-block text-sm font-semibold text-green-800 hover:text-green-900"
        >
          View current reports →
        </Link>
      </Card>
    </div>
  );
}
