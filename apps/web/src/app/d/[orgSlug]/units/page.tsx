import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { UnitsList } from "@/components/units/units-list";
import { canAddUnits } from "@/lib/auth/roles";

export default async function UnitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { orgSlug } = await params;
  const { role = "owner" } = await searchParams;
  const canAdd = canAddUnits(role as "owner" | "manager" | "agent");

  return (
    <div>
      <PageHeader
        title="Units"
        description="Shops, flats, and offices in your plaza"
      />
      <Suspense fallback={<div className="px-3 py-8 text-cell-muted">Loading…</div>}>
        <UnitsList orgSlug={orgSlug} canAdd={canAdd} />
      </Suspense>
    </div>
  );
}
