import { TenantFaqChat } from "@/components/tenant/tenant-faq-chat";
import { requireTenantContext } from "@/lib/auth/session";

export default async function TenantHelpPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireTenantContext(orgSlug);

  return (
    <div className="space-y-4 px-3 py-4">
      <div>
        <h1 className="text-section-title">Help &amp; FAQ</h1>
        <p className="mt-1 text-list-meta">
          Quick answers about paying rent at your plaza. For lease-specific amounts,
          check Home and Transactions.
        </p>
      </div>
      <TenantFaqChat />
    </div>
  );
}
