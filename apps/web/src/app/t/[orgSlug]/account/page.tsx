import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import {
  TenantPasswordForm,
  TenantSignOutButton,
} from "@/components/tenant/tenant-account-client";
import { requireTenantContext } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function TenantAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { orgSlug } = await params;
  const { tab } = await searchParams;
  const ctx = await requireTenantContext(orgSlug);

  const admin = createAdminClient();
  const { data: lease } = await admin
    .from("leases")
    .select("tenant_phone, tenant_email")
    .eq("id", ctx.leaseId)
    .maybeSingle();

  const focusPassword = tab === "password";

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Your account details and login settings"
      />

      <Card className="rounded-none border-x-0 border-t-0 shadow-none">
        <p className="text-stat-label">Name</p>
        <p className="mt-1 text-base font-semibold text-foreground">
          {ctx.tenantDisplayName}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-label normal-case">Shop</dt>
            <dd className="text-detail-value">{ctx.unitCode}</dd>
          </div>
          <div>
            <dt className="text-label normal-case">Email</dt>
            <dd className="text-detail-value break-all">
              {lease?.tenant_email || ctx.user.email || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-label normal-case">Phone</dt>
            <dd className="text-detail-value">{lease?.tenant_phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-label normal-case">Property</dt>
            <dd className="text-detail-value">{ctx.org.name}</dd>
          </div>
        </dl>
      </Card>

      <div className="border-b border-border bg-white px-3 py-4">
        <h2 className="text-section-title">Change password</h2>
        <p className="mt-1 text-list-meta">
          Minimum 8 characters. Use a password you do not reuse elsewhere.
        </p>
        <div className="mt-3">
          <TenantPasswordForm orgSlug={orgSlug} autoFocus={focusPassword} />
        </div>
      </div>

      <div className="bg-white px-3 py-4">
        <TenantSignOutButton />
      </div>
    </div>
  );
}
