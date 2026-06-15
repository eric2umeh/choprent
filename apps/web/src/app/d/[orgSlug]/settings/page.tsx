import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { PropertiesPanel } from "@/components/settings/properties-panel";
import { requireStaffContext } from "@/lib/auth/session";
import { listPropertiesForOrg } from "@/lib/data/sites";
import type { MockRole } from "@/lib/mock/data";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { orgSlug } = await params;
  const { role: roleParam } = await searchParams;
  const ctx = await requireStaffContext(orgSlug, roleParam as MockRole | undefined);
  const properties = await listPropertiesForOrg(ctx.org.id, ctx.demoMode);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Properties, settlement accounts, and integrations"
      />

      <div className="space-y-0">
        <Card className="rounded-none border-x-0 border-t-0 shadow-none">
          <h2 className="text-sm font-semibold text-foreground">Your properties</h2>
          <p className="mt-1 text-cell-muted">
            Landlords can manage multiple plazas, estates, houses, and other sites.
            Units (shops, flats, rooms) are added inside each property.
          </p>

          <div className="mt-4">
            <PropertiesPanel
              orgSlug={orgSlug}
              properties={properties}
              canManage={ctx.role === "owner"}
            />
          </div>
        </Card>

        <Card className="rounded-none border-x-0 border-t-0 shadow-none">
          <h2 className="text-sm font-semibold text-foreground">
            Settlement accounts
          </h2>
          <p className="mt-1 text-cell-muted">
            Bank accounts where rent is collected — per property, coming soon.
          </p>
        </Card>

        <Card className="rounded-none border-x-0 border-t-0 shadow-none">
          <h2 className="text-sm font-semibold text-foreground">Paystack DVA</h2>
          <p className="mt-1 text-cell-muted">
            Dedicated virtual accounts per shop — Phase 1.5.
          </p>
        </Card>
      </div>
    </div>
  );
}
