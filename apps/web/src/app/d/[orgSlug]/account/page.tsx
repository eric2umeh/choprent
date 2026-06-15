import { AccountPageClient } from "@/components/account/account-page-client";
import { requireStaffContext } from "@/lib/auth/session";
import { listPropertiesForOrg } from "@/lib/data/sites";
import { listSettlementAccounts } from "@/lib/data/settlement-accounts";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireStaffContext(orgSlug);
  const [accounts, properties] = await Promise.all([
    listSettlementAccounts(ctx.org.id),
    listPropertiesForOrg(ctx.org.id),
  ]);

  return (
    <AccountPageClient
      orgSlug={orgSlug}
      accounts={accounts}
      properties={properties}
      canManage={ctx.role === "owner"}
    />
  );
}
