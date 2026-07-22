"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ListPanel } from "@/components/ui/page-header";
import {
  ResponsiveDataTable,
  type Column,
} from "@/components/ui/responsive-table";
import type { PortalTenantDetail } from "@/lib/data/portal-tenants";
import { formatNaira } from "@/lib/auth/roles";
import { formatDisplayDate, formatDateRange } from "@/lib/utils/format-date";

const EVENT_LABELS: Record<string, string> = {
  receipt_uploaded: "Uploaded receipt",
  ledger_viewed: "Viewed ledger",
  document_downloaded: "Downloaded document",
  statement_downloaded: "Downloaded statement",
  dva_payment_received: "DVA payment received",
};

type LeaseRow = PortalTenantDetail["leases"][number] & { id: string };
type PaymentRow = PortalTenantDetail["recentPayments"][number];

export function PortalTenantDetailClient({
  orgSlug,
  tenant,
}: {
  orgSlug: string;
  tenant: PortalTenantDetail;
}) {
  const leaseRows: LeaseRow[] = tenant.leases.map((l) => ({
    ...l,
    id: l.leaseId,
  }));

  const leaseColumns: Column<LeaseRow>[] = [
    {
      key: "unit",
      header: "Unit",
      mobilePrimary: true,
      render: (l) => (
        <span className="text-table-cell-strong">{l.unitCode}</span>
      ),
    },
    {
      key: "property",
      header: "Property",
      render: (l) => <span className="text-table-cell">{l.propertyName}</span>,
    },
    {
      key: "term",
      header: "Term",
      render: (l) => (
        <span className="text-table-cell-muted">
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
      key: "open",
      header: "",
      render: (l) => (
        <Link
          href={`/d/${orgSlug}/tenants/${l.leaseId}`}
          className="text-sm text-green-800 underline"
          onClick={(e) => e.stopPropagation()}
        >
          Tenancy
        </Link>
      ),
    },
  ];

  const paymentColumns: Column<PaymentRow>[] = [
    {
      key: "date",
      header: "Date",
      mobilePrimary: true,
      render: (p) => (
        <span className="text-table-cell-muted">
          {formatDisplayDate(p.date)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      mobilePrimary: true,
      render: (p) => (
        <span className="text-table-cell-strong">{formatNaira(p.amount)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <Badge
          variant={
            p.status === "pending"
              ? "warning"
              : p.status === "verified" || p.status === "auto_matched"
                ? "success"
                : "muted"
          }
        >
          {p.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (p) => (
        <span className="text-table-cell-muted">{p.method}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ListPanel>
        <dl className="grid gap-3 p-3 sm:grid-cols-2">
          <div>
            <dt className="text-label">Portal email</dt>
            <dd className="mt-0.5 text-sm text-foreground break-all">
              {tenant.authEmail ?? tenant.email ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-label">Phone</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {tenant.phone ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-label">Account created</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {tenant.authCreatedAt
                ? formatDisplayDate(tenant.authCreatedAt.slice(0, 10))
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-label">Last sign-in</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {tenant.lastSignInAt
                ? formatDisplayDate(tenant.lastSignInAt.slice(0, 10))
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-label">Invite accepted</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {tenant.inviteAcceptedAt
                ? formatDisplayDate(tenant.inviteAcceptedAt.slice(0, 10))
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-label">Last activity</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {tenant.lastActivityAt
                ? formatDisplayDate(tenant.lastActivityAt.slice(0, 10))
                : "—"}
            </dd>
          </div>
        </dl>
      </ListPanel>

      <section>
        <h2 className="mb-2 text-section-title">Linked tenancies</h2>
        <ListPanel>
          <ResponsiveDataTable
            columns={leaseColumns}
            rows={leaseRows}
            emptyMessage="No linked tenancies"
          />
        </ListPanel>
      </section>

      <section>
        <h2 className="mb-2 text-section-title">Recent payments</h2>
        <ListPanel>
          <ResponsiveDataTable
            columns={paymentColumns}
            rows={tenant.recentPayments}
            emptyMessage="No payments yet."
          />
        </ListPanel>
      </section>

      <section>
        <h2 className="mb-2 text-section-title">App activity</h2>
        <ListPanel>
          {tenant.recentActivity.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">No portal activity yet.</p>
          ) : (
            <ul className="divide-y divide-border px-3">
              {tenant.recentActivity.map((a, i) => (
                <li
                  key={`${a.createdAt}-${i}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="text-foreground">
                    {EVENT_LABELS[a.eventType] ?? a.eventType}
                  </span>
                  <span className="shrink-0 text-muted">
                    {formatDisplayDate(a.createdAt.slice(0, 10))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ListPanel>
      </section>
    </div>
  );
}
