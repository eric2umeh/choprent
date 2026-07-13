"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveExpense, type ExpenseActionState } from "@/lib/actions/expenses";
import {
  EXPENSE_CATEGORY_OPTIONS,
  formatExpenseCategory,
  type ExpenseListItem,
} from "@/lib/data/expenses";
import type { PropertySummary } from "@/lib/data/property-types";
import { FormPanel } from "@/components/ui/form-panel";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";

const initial: ExpenseActionState = {};

export function ExpenseForm({
  orgSlug,
  properties,
  units,
  expense,
  onSaved,
}: {
  orgSlug: string;
  properties: PropertySummary[];
  units: { id: string; unitCode: string; siteId: string }[];
  expense?: ExpenseListItem | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [selectedSiteId, setSelectedSiteId] = useState(expense?.siteId ?? "");
  const [state, formAction, pending] = useActionState(
    saveExpense.bind(null, orgSlug),
    initial
  );
  const lastError = useRef<string | undefined>(undefined);
  const lastSuccess = useRef(false);

  const unitsForProperty = useMemo(
    () => units.filter((u) => u.siteId === selectedSiteId),
    [units, selectedSiteId]
  );

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      toast.error(state.error);
      lastError.current = state.error;
    }
    if (state.success && !lastSuccess.current) {
      lastSuccess.current = true;
      toast.success(expense ? "Expense updated." : "Expense recorded.");
      router.refresh();
      onSaved?.();
    }
  }, [state.error, state.success, expense, onSaved, router]);

  return (
    <FormPanel>
      <form action={formAction} className="space-y-4">
        {expense?.id && <input type="hidden" name="expense_id" value={expense.id} />}

        <div>
          <label className="text-label normal-case">Property</label>
          <select
            name="site_id"
            required
            className="input-field mt-1.5"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            disabled={pending || !!expense}
          >
            <option value="">Select property…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {selectedSiteId && unitsForProperty.length > 0 && (
          <div>
            <label className="text-label normal-case">Unit (optional)</label>
            <SearchableSelect
              name="unit_id"
              options={[
                { value: "", label: "Whole property" },
                ...unitsForProperty.map((u) => ({
                  value: u.id,
                  label: u.unitCode,
                })),
              ]}
              defaultValue={expense?.unitId ?? ""}
              emptyLabel="Whole property"
              placeholder="Search unit…"
              disabled={pending}
              className="mt-1.5"
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-label normal-case">Category</label>
            <select
              name="category"
              className="input-field mt-1.5"
              defaultValue={expense?.category ?? "other"}
              disabled={pending}
            >
              {EXPENSE_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label normal-case">Date</label>
            <input
              name="expense_date"
              type="date"
              required
              className="input-field mt-1.5"
              defaultValue={
                expense?.expenseDate ?? new Date().toISOString().slice(0, 10)
              }
              disabled={pending}
            />
          </div>
        </div>

        <div>
          <label className="text-label normal-case">Description</label>
          <input
            name="description"
            required
            className="input-field mt-1.5"
            placeholder="Generator diesel — March"
            defaultValue={expense?.description ?? ""}
            disabled={pending}
          />
        </div>

        <div>
          <label className="text-label normal-case">Amount (₦)</label>
          <input
            name="amount_ngn"
            type="number"
            step="any"
            required
            className="input-field mt-1.5"
            defaultValue={expense?.amountNgn ?? ""}
            disabled={pending}
          />
        </div>

        <div>
          <label className="text-label normal-case">Document (optional)</label>
          <input
            name="attachment"
            type="file"
            accept="image/*,.pdf"
            disabled={pending}
            className="input-field mt-1.5 text-sm file:mr-2 file:rounded file:border-0 file:bg-green-100 file:px-2 file:py-1 file:text-green-800"
          />
          <p className="mt-1 text-form-hint">JPG, PNG, WebP or PDF</p>
        </div>

        {expense && (
          <p className="text-form-hint">
            {formatExpenseCategory(expense.category)} · {expense.propertyName}
            {expense.unitCode ? ` · Unit ${expense.unitCode}` : ""}
          </p>
        )}

        <LoadingButton
          type="submit"
          loading={pending}
          className="btn-primary w-full py-2.5 sm:w-auto sm:px-6"
        >
          {expense ? "Save expense" : "Add expense"}
        </LoadingButton>
      </form>
    </FormPanel>
  );
}
