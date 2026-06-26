"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { rejectPayment, verifyPayment } from "@/lib/actions/payments";
import { getReceiptDownloadUrl } from "@/lib/actions/documents";
import type { PaymentListItem } from "@/lib/data/payments";
import { formatNaira } from "@/lib/auth/roles";
import { toast } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Check, X, FileImage, Clock } from "lucide-react";

function methodLabel(m: string) {
  const map: Record<string, string> = {
    bank_transfer: "Transfer",
    cash_recorded: "Cash",
    dedicated_account: "DVA",
  };
  return map[m] ?? m;
}

function daysPending(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  return Math.max(0, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
}

export function VerificationQueue({
  orgSlug,
  canVerify,
  payments,
}: {
  orgSlug: string;
  canVerify: boolean;
  payments: PaymentListItem[];
}) {
  const router = useRouter();
  const pending = useMemo(
    () => payments.filter((p) => p.status === "pending"),
    [payments]
  );
  const [actingId, setActingId] = useState<string | null>(null);
  const [actingType, setActingType] = useState<"verify" | "reject" | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  async function handleReject(paymentId: string) {
    const { confirmed, value } = await confirmDialog({
      title: "Reject payment?",
      message: "The tenant will not be credited for this transfer.",
      confirmLabel: "Reject payment",
      destructive: true,
      input: {
        label: "Reason (optional)",
        placeholder: "e.g. Amount mismatch, unclear receipt",
      },
    });
    if (!confirmed) return;

    setActingId(paymentId);
    setActingType("reject");
    startTransition(async () => {
      const result = await rejectPayment(orgSlug, paymentId, value || undefined);
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

  if (pending.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50/50 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-green-900">Queue clear</p>
        <p className="mt-1 text-sm text-green-800/80">
          No transfers waiting for verification.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pending.map((p) => {
        const waiting = daysPending(p.createdAt);
        return (
          <article
            key={p.id}
            className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-list-primary">{p.unitCode}</span>
                  <span className="text-list-secondary">{p.tenantName}</span>
                  <Badge variant="warning">Pending</Badge>
                </div>
                <p className="mt-2 text-money">{formatNaira(p.amount)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span>{methodLabel(p.paymentMethod)}</span>
                  {p.periodLabel && (
                    <span className="text-meta-pill">{p.periodLabel}</span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {waiting === 0 ? "Submitted today" : `${waiting}d waiting`}
                  </span>
                </div>
                {p.bankReference && (
                  <p className="mt-1 font-mono text-xs text-muted">
                    Ref: {p.bankReference}
                  </p>
                )}
                {p.paymentNote && (
                  <p className="mt-1 text-xs text-muted">
                    Note: {p.paymentNote}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {p.receiptFileUrl && (
                  <button
                    type="button"
                    className="btn-ghost inline-flex gap-1.5 border border-border px-3 py-1.5 text-sm"
                    disabled={receiptLoadingId === p.id}
                    onClick={() => handleViewReceipt(p.id)}
                  >
                    {receiptLoadingId === p.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <FileImage className="h-4 w-4" />
                    )}
                    Receipt
                  </button>
                )}
                {canVerify && (
                  <>
                    <button
                      type="button"
                      disabled={actingId !== null}
                      onClick={() => handleVerify(p.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      {actingId === p.id && actingType === "verify" ? (
                        <Spinner size="sm" className="text-white" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Verify
                    </button>
                    <button
                      type="button"
                      disabled={actingId !== null}
                      onClick={() => handleReject(p.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      {actingId === p.id && actingType === "reject" ? (
                        <Spinner size="sm" className="text-red-600" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
