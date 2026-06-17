"use client";

import Link from "next/link";
import { propertyPath, unitPath } from "@/lib/routes/dashboard-paths";
import { Badge } from "@/components/ui/badge";
import { ListPanel } from "@/components/ui/page-header";
import { ResponsiveDataTable, type Column } from "@/components/ui/responsive-table";
import { ExpenseHistoryTable } from "@/components/expenses/expense-history-table";
import { TenantPaymentStatusBadge } from "@/components/tenants/tenant-payment-status-badge";
import type { LeaseDetail } from "@/lib/data/leases";
import type { ExpenseListItem } from "@/lib/data/expenses";
import { formatNaira } from "@/lib/auth/roles";

export function TenantDetailClient({
  orgSlug,
  lease,
  unitExpenses,
}: {
  orgSlug: string;
  lease: LeaseDetail;
  unitExpenses: ExpenseListItem[];
}) {
  const paymentColumns: Column<LeaseDetail["payments"][number]>[] = [
    {
      key: "date",
      header: "Date",
      mobilePrimary: true,
      render: (p) => (
        <span className="text-table-cell-muted tabular-nums">{p.date}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      mobilePrimary: true,
      render: (p) => <span className="text-money">{formatNaira(p.amount)}</span>,
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
          {l.startDate} → {l.endDate}
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
            <dd className="mt-0.5 text-money">{formatNaira(lease.annualTotal)}</dd>
          </div>
          <div>
            <dt className="text-label normal-case">Collected</dt>
            <dd className="mt-0.5 text-list-primary font-semibold">
              {formatNaira(lease.paidAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-label normal-case">Arrears</dt>
            <dd
              className={`mt-0.5 font-semibold ${
                lease.arrears > 0 ? "text-money-negative" : "text-green-700"
              }`}
            >
              {formatNaira(lease.arrears)}
            </dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            href={unitPath(orgSlug, lease.propertySlug, lease.unitCode)}
            className="font-semibold text-green-800 hover:text-green-900"
          >
            View unit →
          </Link>
          <span className="text-list-meta">·</span>
          <Link
            href={propertyPath(orgSlug, lease.propertySlug)}
            className="font-semibold text-green-800 hover:text-green-900"
          >
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
    </div>
  );
}
