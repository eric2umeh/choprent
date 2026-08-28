import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyAccountButton } from "@/components/tenant/copy-account-button";
import { TenantInstallAppCard } from "@/components/pwa/add-to-home-screen";
import { TenantPaymentStatusBadge } from "@/components/tenants/tenant-payment-status-badge";
import { requireTenantContext } from "@/lib/auth/session";
import { getTenantHomeSummary } from "@/lib/data/tenant-home";
import { listNotificationsForUser } from "@/lib/data/notifications";
import { TenantNotificationsList } from "@/components/tenant/tenant-notifications-list";
import { formatNaira } from "@/lib/auth/roles";
import { Upload, HelpCircle } from "lucide-react";

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireTenantContext(orgSlug);
  const summary = await getTenantHomeSummary(
    ctx.org.id,
    ctx.unitId,
    ctx.leaseId
  );
  const notifications = await listNotificationsForUser(ctx.user.id, ctx.org.id);

  const payTo = summary.settlement;

  return (
    <div className="space-y-0">
      <TenantInstallAppCard orgSlug={orgSlug} userId={ctx.user.id} />

      <TenantNotificationsList notifications={notifications} />

      <div className="border-b border-green-200 bg-green-50 px-3 py-3">
        <p className="text-stat-label text-green-800">Outstanding</p>
        <p className="text-stat-value">{formatNaira(summary.balance)}</p>
        <div className="mt-1.5">
          <TenantPaymentStatusBadge status={summary.rentStatus} className="text-[10px]" />
        </div>
        <p className="mt-1.5 text-list-meta">
          Shop {ctx.unitCode}
          {summary.periodLabel ? ` · ${summary.periodLabel}` : ""}
        </p>
      </div>

      {payTo ? (
        <Card className="rounded-none border-x-0 border-t-0 shadow-none">
          <p className="text-stat-label">
            {payTo.isDva
              ? "Pay to your shop account"
              : "Rent collection account"}
          </p>
          <p className="mt-1 font-mono text-lg font-bold tracking-wide text-foreground">
            {payTo.accountNumber}
          </p>
          <p className="text-list-meta">
            {payTo.bankName} · {payTo.accountName}
          </p>
          <CopyAccountButton accountNumber={payTo.accountNumber} />
        </Card>
      ) : (
        <Card className="rounded-none border-x-0 border-t-0 shadow-none">
          <p className="text-list-meta">
            Settlement account not configured — contact management.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2 border-b border-border bg-white px-3 py-3">
        <Link
          href={`/t/${orgSlug}/pay`}
          className="btn-primary flex flex-col items-center gap-1.5 py-3 text-center text-xs"
        >
          <Upload className="h-4 w-4" />
          Upload receipt
        </Link>
        <Link
          href={`/t/${orgSlug}/ledger`}
          className="btn-ghost flex flex-col items-center gap-1.5 py-3 text-center text-xs"
        >
          View transactions
        </Link>
        <Link
          href={`/t/${orgSlug}/help`}
          className="btn-ghost flex flex-col items-center gap-1.5 py-3 text-center text-xs"
        >
          <HelpCircle className="h-4 w-4" />
          Rent help
        </Link>
      </div>

      <div className="bg-white px-3 py-3">
        <h2 className="text-section-title">Recent activity</h2>
        <div className="mt-2 divide-y divide-border">
          {summary.recentLines.length === 0 ? (
            <p className="py-2 text-empty-state">No activity yet.</p>
          ) : (
            summary.recentLines.map((line) => (
              <div key={line.id} className="flex justify-between gap-2 py-2">
                <span className="min-w-0 truncate text-list-secondary">{line.label}</span>
                <span
                  className={
                    line.kind === "payment"
                      ? "text-money shrink-0 text-green-700"
                      : "text-money shrink-0"
                  }
                >
                  {line.kind === "payment" ? "−" : "+"}
                  {formatNaira(Math.abs(line.amount))}
                </span>
              </div>
            ))
          )}
        </div>
        {summary.pendingPayments > 0 && (
          <Badge variant="warning" className="mt-2">
            {summary.pendingPayments} receipt
            {summary.pendingPayments === 1 ? "" : "s"} pending review
          </Badge>
        )}
      </div>
    </div>
  );
}
