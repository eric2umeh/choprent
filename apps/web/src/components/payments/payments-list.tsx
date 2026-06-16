"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CompactCard } from "@/components/ui/card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPanel, ListToolbar } from "@/components/ui/page-header";
import { Pagination, usePagination } from "@/components/ui/pagination";
import { ResponsiveDataTable, type Column } from "@/components/ui/responsive-table";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { RecordCashForm } from "@/components/payments/record-cash-form";
import { rejectPayment, verifyPayment } from "@/lib/actions/payments";
import { getReceiptDownloadUrl } from "@/lib/actions/documents";
import type { PaymentListItem } from "@/lib/data/payments";
import { formatNaira } from "@/lib/auth/roles";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { Check, X, FileImage } from "lucide-react";

function methodLabel(m: string) {
  const map: Record<string, string> = {
    bank_transfer: "Transfer",
    cash_recorded: "Cash",
    dedicated_account: "DVA",
  };
  return map[m] ?? m;
}

function statusBadge(status: string) {
  if (status === "verified" || status === "auto_matched") return "success" as const;
  if (status === "pending") return "warning" as const;
  return "danger" as const;
}

export function PaymentsList({
  orgSlug,
  canVerify,
  payments,
  units,
}: {
  orgSlug: string;
  canVerify: boolean;
  payments: PaymentListItem[];
  units: { id: string; unitCode: string }[];
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [showCashForm, setShowCashForm] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actingType, setActingType] = useState<"verify" | "reject" | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.unitCode.toLowerCase().includes(q) ||
        p.tenantName.toLowerCase().includes(q) ||
        (p.bankReference?.toLowerCase().includes(q) ?? false);
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchMethod =
        methodFilter === "all" || p.paymentMethod === methodFilter;
      return matchSearch && matchStatus && matchMethod;
    });
  }, [payments, search, statusFilter, methodFilter]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(
    filtered,
    8
  );

  function handleVerify(paymentId: string) {
    setActingId(paymentId);
    setActingType("verify");
    startTransition(async () => {
      const result = await verifyPayment(orgSlug, paymentId);
      setActingId(null);
      setActingType(null);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Payment verified and allocated.");
        router.refresh();
      }
    });
  }

  function handleReject(paymentId: string) {
    setActingId(paymentId);
    setActingType("reject");
    startTransition(async () => {
      const result = await rejectPayment(orgSlug, paymentId);
      setActingId(null);
      setActingType(null);
      if (result.error) toast.error(result.error);
      else {
        toast.info("Payment rejected.");
        router.refresh();
      }
    });
  }

  function handleViewReceipt(paymentId: string) {
    setReceiptLoadingId(paymentId);
    startTransition(async () => {
      const result = await getReceiptDownloadUrl(orgSlug, paymentId);
      setReceiptLoadingId(null);
      if (result.error) toast.error(result.error);
      else if (result.downloadUrl) window.open(result.downloadUrl, "_blank");
    });
  }

  const columns: Column<PaymentListItem>[] = [
    {
      key: "unit",
      header: "Unit",
      mobilePrimary: true,
      render: (p) => <span className="text-table-cell-strong">{p.unitCode}</span>,
    },
    {
      key: "tenant",
      header: "Tenant",
      mobilePrimary: true,
      render: (p) => <span className="text-table-cell">{p.tenantName}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      mobilePrimary: true,
      render: (p) => <span className="text-money">{formatNaira(p.amount)}</span>,
    },
    {
      key: "period",
      header: "Period",
      render: (p) =>
        p.periodLabel ? (
          <span className="text-meta-pill">{p.periodLabel}</span>
        ) : (
          <span className="text-table-cell-muted">—</span>
        ),
    },
    {
      key: "method",
      header: "Method",
      render: (p) => (
        <span className="text-table-cell-muted">{methodLabel(p.paymentMethod)}</span>
      ),
    },
    {
      key: "date",
      header: "Submitted",
      render: (p) => (
        <span className="text-table-cell-muted tabular-nums">{p.createdAt.slice(0, 10)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <Badge variant={statusBadge(p.status)}>{p.status}</Badge>
      ),
    },
    {
      key: "receipt",
      header: "Receipt",
      render: (p) =>
        p.receiptFileUrl ? (
          <button
            type="button"
            className="btn-ghost inline-flex gap-1 px-2 py-1 text-xs"
            disabled={receiptLoadingId === p.id}
            onClick={(e) => {
              e.stopPropagation();
              handleViewReceipt(p.id);
            }}
          >
            {receiptLoadingId === p.id ? (
              <Spinner size="sm" />
            ) : (
              <FileImage className="h-3.5 w-3.5" />
            )}
            View
          </button>
        ) : (
          <span className="text-table-cell-muted">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (p) =>
        canVerify && p.status === "pending" ? (
          <div className="flex gap-1">
            <button
              type="button"
              disabled={actingId !== null}
              onClick={() => handleVerify(p.id)}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2 py-1 text-[11px] font-semibold text-white transition-all duration-200 hover:bg-green-700 active:scale-95 disabled:opacity-60"
            >
              {actingId === p.id && actingType === "verify" ? (
                <Spinner size="sm" className="text-white" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Verify
            </button>
            <button
              type="button"
              disabled={actingId !== null}
              onClick={() => handleReject(p.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 transition-all duration-200 hover:bg-red-50 active:scale-95 disabled:opacity-60"
            >
              {actingId === p.id && actingType === "reject" ? (
                <Spinner size="sm" className="text-red-600" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <ListToolbar>
        <FilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search unit, tenant, ref…"
        >
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "verified", label: "Verified" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
          <FilterSelect
            label="Method"
            value={methodFilter}
            onChange={(v) => {
              setMethodFilter(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All methods" },
              { value: "bank_transfer", label: "Transfer" },
              { value: "cash_recorded", label: "Cash" },
              { value: "dedicated_account", label: "DVA" },
            ]}
          />
        </FilterBar>
        <div className="flex items-center gap-2 px-3 lg:px-0">
          <ViewToggle value={view} onChange={setView} />
          {canVerify && (
            <button
              type="button"
              className="btn-primary px-3 py-1.5"
              onClick={() => setShowCashForm(true)}
            >
              Record cash
            </button>
          )}
        </div>
      </ListToolbar>

      <ListPanel>
        {view === "table" ? (
          <ResponsiveDataTable
            rows={slice}
            columns={columns}
            emptyMessage="No payments match your filters"
          />
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {slice.map((p, index) => (
              <CompactCard
                key={p.id}
                className="animate-stagger-item"
                style={{ ["--stagger" as string]: index }}
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-list-primary">{p.unitCode}</span>
                      <span className="text-list-secondary">{p.tenantName}</span>
                    </div>
                    <p className="mt-1.5 text-money">{formatNaira(p.amount)}</p>
                    {p.periodLabel && (
                      <span className="mt-1 inline-flex text-meta-pill">{p.periodLabel}</span>
                    )}
                  </div>
                  <Badge variant={statusBadge(p.status)}>{p.status}</Badge>
                </div>
              </CompactCard>
            ))}
          </div>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filtered.length}
          pageSize={pageSize}
        />
      </ListPanel>

      <RecordCashForm
        orgSlug={orgSlug}
        units={units}
        open={showCashForm}
        onClose={() => setShowCashForm(false)}
      />
    </>
  );
}
