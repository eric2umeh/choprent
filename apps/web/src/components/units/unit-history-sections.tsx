"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ListPanel } from "@/components/ui/page-header";
import { ResponsiveDataTable, type Column } from "@/components/ui/responsive-table";
import { ExpenseHistoryTable } from "@/components/expenses/expense-history-table";
import { EntityDocumentsSection } from "@/components/documents/entity-documents-section";
import type { ExpenseListItem } from "@/lib/data/expenses";
import type { DocumentListItem } from "@/lib/data/documents";
import { formatNaira } from "@/lib/auth/roles";
import { formatDisplayDate, formatDateRange } from "@/lib/utils/format-date";

type UnitPayment = {
  id: string;
  amount: number;
  status: string;
  method: string;
  date: string;
  periodLabel: string | null;
  submittedByName?: string | null;
};

type UnitLease = {
  id: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  status: string;
};

export function UnitHistorySections({
  orgSlug,
  payments,
  leases,
  expenses,
  documents,
  canManageDocuments = false,
  unitId,
}: {
  orgSlug: string;
  payments: UnitPayment[];
  leases: UnitLease[];
  expenses: ExpenseListItem[];
  documents: DocumentListItem[];
  canManageDocuments?: boolean;
  unitId: string;
}) {
  const router = useRouter();

  const paymentColumns: Column<UnitPayment>[] = [
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

  const leaseColumns: Column<UnitLease>[] = [
    {
      key: "tenant",
      header: "Tenant",
      mobilePrimary: true,
      render: (l) => <span className="text-table-cell-strong">{l.tenantName}</span>,
    },
    {
      key: "period",
      header: "Lease period",
      mobilePrimary: true,
      render: (l) => (
        <span className="text-table-cell-muted tabular-nums">
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
          onClick={(e) => e.stopPropagation()}
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <>
      <ListPanel>
        <h2 className="border-b border-border px-3 py-3 text-card-title">
          Payment history
        </h2>
        <ResponsiveDataTable
          rows={payments}
          columns={paymentColumns}
          emptyMessage="No payments recorded for this unit yet."
        />
      </ListPanel>

      <ListPanel>
        <h2 className="border-b border-border px-3 py-3 text-card-title">
          Tenant history
        </h2>
        <ResponsiveDataTable
          rows={leases}
          columns={leaseColumns}
          onRowClick={(l) => router.push(`/d/${orgSlug}/tenants/${l.id}`)}
          emptyMessage="No lease history for this unit yet."
        />
      </ListPanel>

      <ListPanel>
        <h2 className="border-b border-border px-3 py-3 text-card-title">
          Expenses &amp; repairs
        </h2>
        <ExpenseHistoryTable
          expenses={expenses}
          showProperty={false}
          showUnit={false}
          emptyMessage="No expenses recorded for this unit yet."
        />
      </ListPanel>

      <EntityDocumentsSection
        orgSlug={orgSlug}
        documents={documents}
        canManage={canManageDocuments}
        defaultUnitId={unitId}
      />
    </>
  );
}
