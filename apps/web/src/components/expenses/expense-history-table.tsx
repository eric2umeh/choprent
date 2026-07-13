"use client";

import { ResponsiveDataTable, type Column } from "@/components/ui/responsive-table";
import {
  formatExpenseCategory,
  type ExpenseListItem,
} from "@/lib/data/expenses";
import { formatNaira } from "@/lib/auth/roles";
import { formatDisplayDate } from "@/lib/utils/format-date";

export function ExpenseHistoryTable({
  expenses,
  showProperty = false,
  showUnit = true,
  emptyMessage = "No expenses recorded yet.",
}: {
  expenses: ExpenseListItem[];
  showProperty?: boolean;
  showUnit?: boolean;
  emptyMessage?: string;
}) {
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
      render: (e) => (
        <span className="text-table-cell-strong">{e.description}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (e) => (
        <span className="text-table-cell-muted">{formatExpenseCategory(e.category)}</span>
      ),
    },
    ...(showProperty
      ? [
          {
            key: "property",
            header: "Property",
            render: (e: ExpenseListItem) => (
              <span className="text-table-cell-muted">{e.propertyName}</span>
            ),
          } satisfies Column<ExpenseListItem>,
        ]
      : []),
    ...(showUnit
      ? [
          {
            key: "unit",
            header: "Unit",
            render: (e: ExpenseListItem) => (
              <span className="text-table-cell-muted">{e.unitCode ?? "All units"}</span>
            ),
          } satisfies Column<ExpenseListItem>,
        ]
      : []),
    {
      key: "amount",
      header: "Amount",
      mobilePrimary: true,
      render: (e) => (
        <span className="text-table-cell-strong tabular-nums">{formatNaira(e.amountNgn)}</span>
      ),
    },
  ];

  return (
    <ResponsiveDataTable
      rows={expenses}
      columns={columns}
      emptyMessage={emptyMessage}
    />
  );
}
