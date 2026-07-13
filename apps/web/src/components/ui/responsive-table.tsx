"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

export type Column<T> = {
  key: string;
  header: string;
  /** Shown on mobile without expanding */
  mobilePrimary?: boolean;
  className?: string;
  render: (row: T) => React.ReactNode;
};

export function ResponsiveDataTable<T extends { id: string }>({
  rows,
  columns,
  onRowClick,
  emptyMessage = "No results",
}: {
  rows: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}) {
  const primaryCols = columns.filter((c) => c.mobilePrimary);
  const detailCols = columns.filter((c) => !c.mobilePrimary);

  if (rows.length === 0) {
    return (
      <div className="px-3 py-10 text-center text-empty-state">{emptyMessage}</div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="border-b border-border bg-surface-subtle/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn("px-3 py-2.5 text-left", col.className)}
                >
                  <span className="text-table-head">{col.header}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-border bg-white transition",
                  onRowClick && "cursor-pointer hover:bg-surface-subtle"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-3 py-3.5 align-middle", col.className)}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked rows — no horizontal scroll */}
      <div className="divide-y divide-border md:hidden">
        {rows.map((row) => (
          <MobileRow
            key={row.id}
            row={row}
            primaryCols={primaryCols}
            detailCols={detailCols}
            onRowClick={onRowClick}
          />
        ))}
      </div>
    </>
  );
}

function MobileRow<T>({
  row,
  primaryCols,
  detailCols,
  onRowClick,
}: {
  row: T;
  primaryCols: Column<T>[];
  detailCols: Column<T>[];
  onRowClick?: (row: T) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white px-3 py-2.5">
      <div
        className={cn("flex items-start justify-between gap-2", onRowClick && "cursor-pointer")}
        onClick={() => onRowClick?.(row)}
        onKeyDown={(e) => e.key === "Enter" && onRowClick?.(row)}
        role={onRowClick ? "button" : undefined}
        tabIndex={onRowClick ? 0 : undefined}
      >
        <div className="min-w-0 flex-1 space-y-1">
          {primaryCols.map((col) => (
            <div key={col.key}>{col.render(row)}</div>
          ))}
        </div>
        {detailCols.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            className="btn-icon shrink-0 p-1.5"
            aria-expanded={open}
          >
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {open && detailCols.length > 0 && (
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          {detailCols.map((col) => (
            <div key={col.key} className="flex items-start justify-between gap-3">
              <span className="text-table-head shrink-0 pt-0.5">{col.header}</span>
              <div className="min-w-0 flex-1 text-right text-table-cell">{col.render(row)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
