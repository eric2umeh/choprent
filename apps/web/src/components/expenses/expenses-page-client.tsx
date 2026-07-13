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
import { formatDisplayDate } from "@/lib/utils/format-date";
import { StatCard } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ListPanel, ListToolbar } from "@/components/ui/page-header";
import { Pagination, usePagination } from "@/components/ui/pagination";
import {
  ResponsiveDataTable,
  type Column,
} from "@/components/ui/responsive-table";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Pencil, Trash2 } from "lucide-react";

export function ExpensesPageClient({
  orgSlug,
  expenses,
  pnl,
  properties,
  units,
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
  units: { id: string; unitCode: string; siteId: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("table");
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
        e.propertyName.toLowerCase().includes(q) ||
        (e.unitCode?.toLowerCase().includes(q) ?? false);
      const matchProperty =
        propertyFilter === "all" || e.siteId === propertyFilter;
      return matchSearch && matchProperty;
    });
  }, [expenses, search, propertyFilter]);

  const { page, setPage, totalPages, slice, pageSize } = usePagination(filtered);

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

  const columns: Column<ExpenseListItem>[] = [
    {
      key: "date",
      header: "Date",
      mobilePrimary: true,
      render: (e) => (
        <span className="text-table-cell-muted tabular-nums">
          {formatDisplayDate(e.expenseDate)}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      mobilePrimary: true,
      render: (e) => <span className="text-table-cell">{e.description}</span>,
    },
    {
      key: "property",
      header: "Property",
      render: (e) => (
        <span className="text-table-cell-muted">{e.propertyName}</span>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      render: (e) => (
        <span className="text-table-cell-muted">{e.unitCode ?? "All units"}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (e) => (
        <span className="text-meta-pill">{formatExpenseCategory(e.category)}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      mobilePrimary: true,
      render: (e) => <span className="text-money">{formatNaira(e.amountNgn)}</span>,
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            render: (e: ExpenseListItem) => (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="icon-btn-muted"
                  title="Edit"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setEditing(e);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="icon-btn-danger"
                  title="Delete"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    handleDelete(e);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          } satisfies Column<ExpenseListItem>,
        ]
      : []),
  ];

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
                      row.netNgn >= 0
                        ? "font-semibold text-green-700"
                        : "font-semibold text-red-600"
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
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search description, property, or unit…"
        >
          <FilterSelect
            label="Property"
            value={propertyFilter}
            onChange={(v) => {
              setPropertyFilter(v);
              setPage(1);
            }}
            options={[
              { value: "all", label: "All properties" },
              ...properties.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </FilterBar>
        <div className="flex items-center gap-2 px-3 lg:px-0">
          <ViewToggle value={view} onChange={setView} />
          {canManage && properties.length > 0 && (
            <button
              type="button"
              className="btn-primary px-3 py-1.5"
              onClick={() => setShowAdd(true)}
            >
              Add expense
            </button>
          )}
        </div>
      </ListToolbar>

      <ListPanel>
        {view === "table" ? (
          <ResponsiveDataTable
            rows={slice}
            columns={columns}
            emptyMessage={
              expenses.length === 0
                ? "No expenses recorded yet."
                : "No expenses match your filters."
            }
          />
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {slice.map((expense) => (
              <div
                key={expense.id}
                className="rounded-xl border border-border px-3 py-3"
              >
                <p className="text-list-primary">{expense.description}</p>
                <p className="mt-0.5 text-list-secondary">
                  {expense.propertyName}
                  {expense.unitCode ? ` · Unit ${expense.unitCode}` : ""} ·{" "}
                  {formatExpenseCategory(expense.category)}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-list-meta">
                    {formatDisplayDate(expense.expenseDate)}
                  </span>
                  <span className="text-money">{formatNaira(expense.amountNgn)}</span>
                </div>
              </div>
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

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add expense"
        description="Record a property or unit cost for P&amp;L tracking."
      >
        <ExpenseForm
          orgSlug={orgSlug}
          properties={properties}
          units={units}
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
            units={units}
            expense={editing}
            onSaved={() => setEditing(null)}
          />
        )}
      </Modal>
    </>
  );
}
