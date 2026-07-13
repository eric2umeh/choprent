"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  fetchUnitBalanceBreakdown,
  recordCashPayment,
} from "@/lib/actions/payments";
import { LoadingButton } from "@/components/ui/loading-button";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "@/components/ui/toast";
import { formatNaira } from "@/lib/auth/roles";
import type { BalanceBreakdownRow } from "@/lib/data/unit-balance-breakdown";
import { Spinner } from "@/components/ui/spinner";

type UnitOption = { id: string; unitCode: string; tenantName?: string | null };

export function RecordCashForm({
  orgSlug,
  units,
  open,
  onClose,
}: {
  orgSlug: string;
  units: UnitOption[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [breakdown, setBreakdown] = useState<BalanceBreakdownRow[]>([]);
  const [breakdownTotal, setBreakdownTotal] = useState(0);
  const [loadingBreakdown, startBreakdown] = useTransition();

  const unitOptions = units.map((u) => ({
    value: u.id,
    label: u.unitCode,
    hint: u.tenantName ?? "Vacant",
  }));

  useEffect(() => {
    if (!unitId) {
      setBreakdown([]);
      setBreakdownTotal(0);
      return;
    }
    startBreakdown(async () => {
      const result = await fetchUnitBalanceBreakdown(orgSlug, unitId);
      setBreakdown(result.rows);
      setBreakdownTotal(result.total);
    });
  }, [unitId, orgSlug]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("unit_id", unitId);
    const result = await recordCashPayment(orgSlug, {}, formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Cash payment recorded and allocated.");
    setUnitId("");
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record cash payment"
      description="Verified immediately — allocates to oldest arrears first."
      preventClose={loading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-label normal-case">Unit</label>
          <SearchableSelect
            name="unit_id_display"
            options={unitOptions}
            value={unitId}
            onValueChange={setUnitId}
            emptyLabel="Search unit or tenant…"
            placeholder="Type unit code or tenant name…"
            required
            disabled={loading}
            className="mt-1"
          />
        </div>

        {unitId && (
          <div className="rounded-xl border border-border bg-surface-subtle/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-label normal-case">Outstanding balance</p>
              {loadingBreakdown ? (
                <Spinner className="h-4 w-4 text-muted" />
              ) : (
                <p className="text-money text-sm font-semibold">
                  {formatNaira(breakdownTotal)}
                </p>
              )}
            </div>
            {!loadingBreakdown && breakdown.length > 0 && (
              <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                {breakdown.map((row) => (
                  <li
                    key={`${row.periodLabel}-${row.kindKey}`}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-list-secondary">
                      <span className="font-medium text-foreground">
                        {row.periodLabel}
                      </span>
                      {" · "}
                      {row.kind}
                    </span>
                    <span className="text-money shrink-0">{formatNaira(row.balance)}</span>
                  </li>
                ))}
              </ul>
            )}
            {!loadingBreakdown && breakdown.length === 0 && (
              <p className="mt-1 text-xs text-muted">No outstanding balance on record.</p>
            )}
          </div>
        )}

        <div>
          <label className="text-label normal-case">Amount (₦)</label>
          <input
            name="amount_ngn"
            type="number"
            step="any"
            className="input-field mt-1"
            required
            disabled={loading}
            placeholder="500000"
          />
        </div>
        <div>
          <label className="text-label normal-case">Note / reason (optional)</label>
          <textarea
            name="payment_note"
            rows={2}
            className="input-field mt-1 resize-none"
            disabled={loading}
            placeholder="e.g. Partial payment for 2025 rent, paid in cash at office"
          />
        </div>
        <div>
          <label className="text-label normal-case">Period label (optional)</label>
          <input
            name="period_label"
            className="input-field mt-1"
            disabled={loading}
            placeholder="2026 partial"
          />
        </div>
        <div>
          <label className="text-label normal-case">Payment date</label>
          <input
            name="payment_date"
            type="date"
            className="input-field mt-1"
            disabled={loading}
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div>
          <label className="text-label normal-case">Receipt / document (optional)</label>
          <input
            type="file"
            name="attachments"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="input-field mt-1 text-sm file:mr-2 file:rounded file:border-0 file:bg-green-100 file:px-2 file:py-1 file:text-green-800"
            disabled={loading}
          />
          <p className="mt-1 text-form-hint">JPG, PNG, WebP or PDF — multiple files allowed</p>
        </div>

        <div className="flex gap-2 pt-1">
          <LoadingButton
            type="submit"
            loading={loading}
            loadingLabel="Saving…"
            className="btn-primary flex-1 py-2 disabled:opacity-60"
          >
            Save payment
          </LoadingButton>
          <button
            type="button"
            className="btn-ghost flex-1 py-2"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
