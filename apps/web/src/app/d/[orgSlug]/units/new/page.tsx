import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { NewUnitForm } from "@/components/units/new-unit-form";
import { requireStaffContext } from "@/lib/auth/session";
import { canAddUnits } from "@/lib/auth/roles";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { MockRole } from "@/lib/mock/data";

export default async function NewUnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { orgSlug } = await params;
  const { role: roleParam } = await searchParams;
  const ctx = await requireStaffContext(orgSlug, roleParam as MockRole | undefined);

  if (!canAddUnits(ctx.role)) {
    redirect(`/d/${orgSlug}/units`);
  }

  return (
    <div>
      <PageHeader
        title="Add unit"
        description="Landlord only — create a new billable unit in the plaza"
        action={
          <Link href={`/d/${orgSlug}/units`} className="btn-ghost px-3 py-1.5">
            ← Back
          </Link>
        }
      />

      <Card className="rounded-none border-x-0 border-t-0 shadow-none">
        <NewUnitForm orgSlug={orgSlug} />
        <p className="mt-4 text-[11px] text-muted">
          Rent charges are configured in leases (Sprint 2). Composite codes like 14/16
          are detected automatically.
        </p>
      </Card>
    </div>
  );
}
