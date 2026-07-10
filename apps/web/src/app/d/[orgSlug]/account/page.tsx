import { AccountPageClient } from "@/components/account/account-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { isPrivilegedRole } from "@/lib/auth/roles";
import { listSettlementAccounts } from "@/lib/data/settlement-accounts";
import { listPropertiesForOrg } from "@/lib/data/sites";
import { listOrgVirtualAccounts } from "@/lib/actions/virtual-accounts";
import { isPaystackConfigured, isPaystackDvaEnabled } from "@/lib/paystack/client";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const paystackDvaEnabled = isPaystackDvaEnabled();
  const [accounts, properties, virtualAccounts] = await Promise.all([
    listSettlementAccounts(ctx.org.id),
    listPropertiesForOrg(ctx.org.id),
    paystackDvaEnabled && isPrivilegedRole(ctx.role)
      ? listOrgVirtualAccounts(orgSlug)
      : Promise.resolve([]),
  ]);

  return (
    <AccountPageClient
      orgSlug={orgSlug}
      accounts={accounts}
      properties={properties}
      virtualAccounts={virtualAccounts}
      paystackConfigured={isPaystackConfigured()}
      paystackDvaEnabled={paystackDvaEnabled}
      canManage={isPrivilegedRole(ctx.role)}
    />
  );
}
