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
import { TenantPaymentStatusBadge } from "@/components/tenants/tenant-payment-status-badge";
import { rejectPayment, unverifyPayment, verifyPayment } from "@/lib/actions/payments";
import { EditCashForm } from "@/components/payments/edit-cash-form";
import { getReceiptDownloadUrl } from "@/lib/actions/documents";
import type { PaymentListItem } from "@/lib/data/payments";
import { formatNaira } from "@/lib/auth/roles";
import { formatDisplayDate } from "@/lib/utils/format-date";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { Check, X, FileImage, Pencil, Undo2 } from "lucide-react";

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
  isOwner,
  payments,
  units,
}: {
  orgSlug: string;
  canVerify: boolean;
  isOwner: boolean;
  payments: PaymentListItem[];
  units: { id: string; unitCode: string; tenantName?: string | null }[];
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rentStatusFilter, setRentStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [showCashForm, setShowCashForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentListItem | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actingType, setActingType] = useState<"verify" | "reject" | "unverify" | null>(null);
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
      const matchRentStatus =
        rentStatusFilter === "all" ||
        (p.rentStatus !== null && p.rentStatus === rentStatusFilter);
      const matchMethod =
        methodFilter === "all" || p.paymentMethod === methodFilter;
      return matchSearch && matchStatus && matchRentStatus && matchMethod;
    });
  }, [payments, search, statusFilter, rentStatusFilter, methodFilter]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(filtered);

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

  function handleUnverify(paymentId: string) {
    setActingId(paymentId);
    setActingType("unverify");
    startTransition(async () => {
      const result = await unverifyPayment(orgSlug, paymentId);
      setActingId(null);
      setActingType(null);
      if (result.error) toast.error(result.error);
      else {
        toast.info("Payment unverified — back in pending queue.");
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
      key: "rentStatus",
      header: "Rent status",
      render: (p) =>
        p.rentStatus ? (
          <TenantPaymentStatusBadge status={p.rentStatus} />
        ) : (
          <span className="text-table-cell-muted">—</span>
        ),
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
        <div>
          <span className="text-table-cell-muted tabular-nums">
            {formatDisplayDate(p.createdAt)}
          </span>
          {p.submittedByName && (
            <p className="mt-0.5 text-[11px] text-muted">{p.submittedByName}</p>
          )}
        </div>
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
      render: (p) => {
        const canEdit =
          canVerify &&
          p.paymentMethod === "cash_recorded" &&
          p.status !== "rejected";

        if (canVerify && p.status === "pending") {
          return (
            <div className="flex gap-1">
              <button
                type="button"
                disabled={actingId !== null}
                onClick={(e) => {
                  e.stopPropagation();
                  handleVerify(p.id);
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject(p.id);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 transition-all duration-200 hover:bg-red-50 active:scale-95 disabled:opacity-60"
              >
                {actingId === p.id && actingType === "reject" ? (
                  <Spinner size="sm" className="text-red-600" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </div>
          );
        }

        if (
          isOwner &&
          p.status === "verified" &&
          p.paymentMethod !== "dedicated_account"
        ) {
          return (
            <button
              type="button"
              disabled={actingId !== null}
              className="btn-ghost inline-flex gap-1 px-2 py-1 text-xs text-amber-800"
              onClick={(e) => {
                e.stopPropagation();
                handleUnverify(p.id);
              }}
            >
              {actingId === p.id && actingType === "unverify" ? (
                <Spinner size="sm" />
              ) : (
                <Undo2 className="h-3.5 w-3.5" />
              )}
              Unverify
            </button>
          );
        }

        if (canEdit) {
          return (
            <button
              type="button"
              className="btn-ghost inline-flex gap-1 px-2 py-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setEditingPayment(p);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          );
        }

        return null;
      },
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
            label="Rent status"
            value={rentStatusFilter}
            onChange={(v) => {
              setRentStatusFilter(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "paid", label: "Paid" },
              { value: "partial", label: "Partial" },
              { value: "debt", label: "In debt" },
            ]}
          />
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
            onRowClick={(p) => {
              if (p.leaseId) {
                router.push(`/d/${orgSlug}/tenants/${p.leaseId}`);
              }
            }}
            emptyMessage="No payments match your filters"
          />
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {slice.map((p, index) => (
              <CompactCard
                key={p.id}
                className="animate-stagger-item"
                style={{ ["--stagger" as string]: index }}
                onClick={() => {
                  if (p.leaseId) {
                    router.push(`/d/${orgSlug}/tenants/${p.leaseId}`);
                  }
                }}
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

      <EditCashForm
        orgSlug={orgSlug}
        payment={editingPayment}
        open={!!editingPayment}
        onClose={() => setEditingPayment(null)}
      />
    </>
  );
}
