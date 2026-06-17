"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExpense } from "@/lib/actions/expenses";
import {
  formatExpenseCategory,
  type ExpenseListItem,
  type PropertyPnL,
} from "@/lib/data/expenses";
import type { PropertySummary } from "@/lib/data/property-types";
import { formatNaira } from "@/lib/auth/roles";
import { StatCard } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPanel, ListToolbar } from "@/components/ui/page-header";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Pencil, Trash2 } from "lucide-react";

export function ExpensesPageClient({
  orgSlug,
  expenses,
  pnl,
  properties,
  canManage,
}: {
  orgSlug: string;
  expenses: ExpenseListItem[];
  pnl: {
    year: number;
    rows: PropertyPnL[];
    totalRevenue: number;
    totalExpenses: number;
    totalNet: number;
  };
  properties: PropertySummary[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ExpenseListItem | null>(null);
  const [, startDelete] = useTransition();

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.propertyName.toLowerCase().includes(q);
      const matchProperty =
        propertyFilter === "all" || e.siteId === propertyFilter;
      return matchSearch && matchProperty;
    });
  }, [expenses, search, propertyFilter]);

  async function handleDelete(expense: ExpenseListItem) {
    const { confirmed } = await confirmDialog({
      title: "Delete expense?",
      message: `Remove ${formatNaira(expense.amountNgn)} — ${expense.description}?`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;

    startDelete(async () => {
      const result = await deleteExpense(orgSlug, expense.id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Expense deleted.");
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 border-b border-border bg-white px-3 py-3 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatNaira(pnl.totalRevenue)}
          hint={`Verified rent · ${pnl.year}`}
        />
        <StatCard
          label="Expenses"
          value={formatNaira(pnl.totalExpenses)}
          hint={`Recorded costs · ${pnl.year}`}
        />
        <StatCard
          label="Net"
          value={formatNaira(pnl.totalNet)}
          hint="Revenue minus expenses"
        />
        <StatCard
          label="Margin"
          value={
            pnl.totalRevenue > 0
              ? `${Math.round((pnl.totalNet / pnl.totalRevenue) * 100)}%`
              : "—"
          }
          hint="Net as % of revenue"
        />
      </div>

      {pnl.rows.length > 0 && (
        <div className="border-b border-border bg-white px-3 py-4">
          <h2 className="text-card-title">P&amp;L by property</h2>
          <div className="mt-3 space-y-2">
            {pnl.rows.map((row) => (
              <div
                key={row.siteId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5"
              >
                <p className="text-list-primary">{row.propertyName}</p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="text-list-secondary">
                    Rev {formatNaira(row.revenueNgn)}
                  </span>
                  <span className="text-list-secondary">
                    Exp {formatNaira(row.expensesNgn)}
                  </span>
                  <span
                    className={
                      row.netNgn >= 0 ? "text-green-700 font-semibold" : "text-red-600 font-semibold"
                    }
                  >
                    Net {formatNaira(row.netNgn)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ListToolbar>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search description or property…"
        >
          <FilterSelect
            label="Property"
            value={propertyFilter}
            onChange={setPropertyFilter}
            options={[
              { value: "all", label: "All properties" },
              ...properties.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </FilterBar>
        {canManage && properties.length > 0 && (
          <button
            type="button"
            className="btn-primary mx-3 px-3 py-1.5 lg:mx-0"
            onClick={() => setShowAdd(true)}
          >
            Add expense
          </button>
        )}
      </ListToolbar>

      <ListPanel>
        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-empty-state">
            {expenses.length === 0
              ? "No expenses recorded yet."
              : "No expenses match your filters."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((expense) => (
              <li
                key={expense.id}
                className="flex items-start justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-list-primary">{expense.description}</p>
                  <p className="mt-0.5 text-list-secondary">
                    {expense.propertyName} · {formatExpenseCategory(expense.category)}
                  </p>
                  <p className="mt-0.5 text-list-meta">{expense.expenseDate}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-money">{formatNaira(expense.amountNgn)}</span>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        className="icon-btn-muted"
                        title="Edit"
                        onClick={() => setEditing(expense)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="icon-btn-danger"
                        title="Delete"
                        onClick={() => handleDelete(expense)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ListPanel>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add expense"
        description="Record a property cost for P&amp;L tracking."
      >
        <ExpenseForm
          orgSlug={orgSlug}
          properties={properties}
          onSaved={() => setShowAdd(false)}
        />
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit expense"
      >
        {editing && (
          <ExpenseForm
            orgSlug={orgSlug}
            properties={properties}
            expense={editing}
            onSaved={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  );
}
