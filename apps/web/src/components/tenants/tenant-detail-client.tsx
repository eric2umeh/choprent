"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { propertyPath, unitPath } from "@/lib/routes/dashboard-paths";
import { Badge } from "@/components/ui/badge";
import { ListPanel } from "@/components/ui/page-header";
import { ResponsiveDataTable, type Column } from "@/components/ui/responsive-table";
import { ExpenseHistoryTable } from "@/components/expenses/expense-history-table";
import { EntityDocumentsSection } from "@/components/documents/entity-documents-section";
import { TenantPaymentStatusBadge } from "@/components/tenants/tenant-payment-status-badge";
import { LeaseForm } from "@/components/leases/lease-form";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { endActiveLease } from "@/lib/actions/leases";
import { inviteTenant } from "@/lib/actions/tenant-invite";
import type { LeaseDetail } from "@/lib/data/leases";
import type { ExpenseListItem } from "@/lib/data/expenses";
import type { DocumentListItem } from "@/lib/data/documents";
import type { SettlementAccountItem } from "@/lib/data/settlement-accounts";
import { formatNaira } from "@/lib/auth/roles";
import { formatDisplayDate, formatDateRange } from "@/lib/utils/format-date";
import { Mail } from "lucide-react";

export function TenantDetailClient({
  orgSlug,
  lease,
  unitExpenses,
  documents,
  canManage = false,
  settlementAccounts = [],
}: {
  orgSlug: string;
  lease: LeaseDetail;
  unitExpenses: ExpenseListItem[];
  documents: DocumentListItem[];
  canManage?: boolean;
  settlementAccounts?: SettlementAccountItem[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [ending, startEnd] = useTransition();
  const [inviting, startInvite] = useTransition();

  function handleInviteTenant() {
    if (!lease.tenantEmail) {
      toast.error("Add a tenant email on the lease first, then send the invite.");
      return;
    }
    startInvite(async () => {
      const result = await inviteTenant(orgSlug, lease.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.inviteUrl) {
        try {
          await navigator.clipboard.writeText(result.inviteUrl);
          toast.success("Email is not configured — invite link copied. Share it with the tenant.");
        } catch {
          toast.success("Email is not configured — copy the invite link below and share it.");
        }
        await confirmDialog({
          title: "Share this invite link",
          message:
            "Email sending is not set up, so the invite was not emailed. " +
            "Send this link to the tenant (WhatsApp/SMS). It expires in 7 days.",
          confirmLabel: "Done",
          input: {
            label: "Invite link",
            defaultValue: result.inviteUrl,
          },
        });
      } else {
        toast.success(
          result.alreadyLinked
            ? `Invite sent to ${lease.tenantEmail}. They can set a password and open their dashboard.`
            : `Invite sent to ${lease.tenantEmail}.`
        );
      }
      router.refresh();
    });
  }

  async function handleEndTenancy() {
    const { confirmed } = await confirmDialog({
      title: "End tenancy?",
      message: `End the lease for ${lease.tenantName} on unit ${lease.unitCode}? The unit will be marked vacant.`,
      confirmLabel: "End tenancy",
      destructive: true,
    });
    if (!confirmed) return;

    startEnd(async () => {
      const result = await endActiveLease(orgSlug, lease.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Tenancy ended. Unit is now vacant.");
      router.push(`/d/${orgSlug}/tenants`);
      router.refresh();
    });
  }

  const paymentColumns: Column<LeaseDetail["payments"][number]>[] = [
    {
      key: "date",
      header: "Date",
      mobilePrimary: true,
      render: (p) => (
        <span className="text-table-cell-muted tabular-nums">
          {formatDisplayDate(p.date)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      mobilePrimary: true,
      render: (p) => (
        <span className="text-table-cell-strong tabular-nums">{formatNaira(p.amount)}</span>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (p) => (
        <span className="text-table-cell-muted">{p.method.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (p) => (
        <span className="text-meta-pill">{p.periodLabel ?? "—"}</span>
      ),
    },
    {
      key: "submittedBy",
      header: "Submitted by",
      render: (p) => (
        <span className="text-table-cell-muted">{p.submittedByName ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <Badge
          variant={
            p.status === "verified" || p.status === "auto_matched"
              ? "success"
              : p.status === "pending"
                ? "warning"
                : "danger"
          }
        >
          {p.status}
        </Badge>
      ),
    },
  ];

  const priorLeaseColumns: Column<LeaseDetail["priorLeases"][number]>[] = [
    {
      key: "tenant",
      header: "Tenant",
      mobilePrimary: true,
      render: (l) => <span className="text-table-cell">{l.tenantName}</span>,
    },
    {
      key: "period",
      header: "Lease period",
      mobilePrimary: true,
      render: (l) => (
        <span className="text-period-compact">
          {formatDateRange(l.startDate, l.endDate)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (l) => (
        <Badge variant={l.status === "active" ? "success" : "muted"}>
          {l.status}
        </Badge>
      ),
    },
    {
      key: "link",
      header: "",
      render: (l) => (
        <Link
          href={`/d/${orgSlug}/tenants/${l.id}`}
          className="btn-ghost px-2 py-1 text-xs"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-0">
      {canManage && lease.status === "active" && (
        <div className="flex flex-wrap gap-2 border-b border-border bg-white px-3 py-3">
          <button
            type="button"
            className="btn-primary px-3 py-1.5 text-sm"
            onClick={() => setEditOpen(true)}
          >
            Edit lease
          </button>
          {lease.tenantEmail && (
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
              onClick={handleInviteTenant}
              disabled={inviting}
            >
              <Mail className="h-4 w-4" />
              {lease.tenantUserId ? "Resend portal invite" : "Invite to portal"}
            </button>
          )}
          <button
            type="button"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            onClick={handleEndTenancy}
            disabled={ending}
          >
            End tenancy
          </button>
        </div>
      )}
      <div className="border-b border-border bg-white px-3 py-4">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-label normal-case">Rent status</dt>
            <dd className="mt-1">
              <TenantPaymentStatusBadge status={lease.paymentStatus} />
            </dd>
          </div>
          <div>
            <dt className="text-label normal-case">Annual rent</dt>
            <dd className="mt-0.5 text-detail-value">{formatNaira(lease.annualTotal)}</dd>
          </div>
          <div>
            <dt className="text-label normal-case">Collected</dt>
            <dd className="text-detail-value">{formatNaira(lease.paidAmount)}</dd>
          </div>
          <div>
            <dt className="text-label normal-case">Arrears</dt>
            <dd
              className={
                lease.arrears > 0 ? "text-detail-value text-money-negative" : "text-detail-value"
              }
            >
              {formatNaira(lease.arrears)}
            </dd>
          </div>
        </dl>
        <dl className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-label normal-case">Lease period</dt>
            <dd className="text-detail-value tabular-nums">
              {formatDateRange(lease.startDate, lease.endDate)}
            </dd>
          </div>
          <div>
            <dt className="text-label normal-case">Billing cadence</dt>
            <dd className="text-detail-value capitalize">{lease.billingCadence}</dd>
          </div>
          <div>
            <dt className="text-label normal-case">Phone</dt>
            <dd className="text-detail-value">{lease.tenantPhone ?? "—"}</dd>
          </div>
          {lease.tenantEmail && (
            <div>
              <dt className="text-label normal-case">Email</dt>
              <dd className="text-detail-value break-all">{lease.tenantEmail}</dd>
              <dd className="text-detail-meta">
                {lease.tenantUserId ? (
                  <>
                    Portal access linked ·{" "}
                    <Link
                      href={`/d/${orgSlug}/tenants/portal/${lease.tenantUserId}`}
                      className="text-section-link"
                    >
                      View app account
                    </Link>
                  </>
                ) : (
                  "Portal invite not accepted yet"
                )}
              </dd>
            </div>
          )}
          {(lease.createdAt || lease.createdByName) && (
            <div>
              <dt className="text-label normal-case">Tenancy created</dt>
              <dd className="text-detail-value">
                {lease.createdAt ? formatDisplayDate(lease.createdAt) : "—"}
                {lease.createdByName ? (
                  <span className="text-detail-meta"> · {lease.createdByName}</span>
                ) : null}
              </dd>
            </div>
          )}
        </dl>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href={unitPath(orgSlug, lease.propertySlug, lease.unitCode)} className="text-section-link">
            View unit →
          </Link>
          <span className="text-list-meta">·</span>
          <Link href={propertyPath(orgSlug, lease.propertySlug)} className="text-section-link">
            View property →
          </Link>
        </div>
      </div>

      <ListPanel>
        <h2 className="border-b border-border px-3 py-3 text-card-title">
          Payment history
        </h2>
        <ResponsiveDataTable
          rows={lease.payments}
          columns={paymentColumns}
          emptyMessage="No payments recorded yet."
        />
      </ListPanel>

      <ListPanel>
        <h2 className="border-b border-border px-3 py-3 text-card-title">
          Unit expenses &amp; repairs
        </h2>
        <ExpenseHistoryTable
          expenses={unitExpenses}
          showProperty={false}
          showUnit={false}
        />
      </ListPanel>

      <EntityDocumentsSection
        orgSlug={orgSlug}
        documents={documents}
        canManage={canManage}
        defaultLeaseId={lease.id}
        defaultUnitId={lease.unitId}
      />

      {lease.priorLeases.length > 0 && (
        <ListPanel>
          <h2 className="border-b border-border px-3 py-3 text-card-title">
            Prior tenancies (this unit)
          </h2>
          <ResponsiveDataTable
            rows={lease.priorLeases}
            columns={priorLeaseColumns}
            emptyMessage="No prior tenancies."
          />
        </ListPanel>
      )}

      {canManage && (
        <LeaseForm
          orgSlug={orgSlug}
          mode="edit"
          lease={lease}
          settlementAccounts={settlementAccounts}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
