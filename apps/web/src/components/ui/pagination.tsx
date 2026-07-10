"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const TABLE_PAGE_SIZE = 15;

function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 1) return [1];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("ellipsis");

  if (!pages.includes(total)) pages.push(total);

  return pages;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  totalItems: number;
  pageSize: number;
}) {
  const safeTotal = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotal);
  const pages = pageNumbers(safePage, safeTotal);

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted hover:bg-muted/40 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p, index) =>
          p === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-8 min-w-8 items-center justify-center px-1 text-sm text-muted"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm font-medium tabular-nums",
                p === safePage
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-border text-foreground hover:bg-muted/40"
              )}
              aria-label={`Page ${p}`}
              aria-current={p === safePage ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          disabled={safePage >= safeTotal}
          onClick={() => onPageChange(safePage + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted hover:bg-muted/40 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-muted tabular-nums">
        Page {safePage} of {safeTotal}
      </p>
    </div>
  );
}

export function usePagination<T>(items: T[], pageSize = TABLE_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);
  const slice = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return { page: safePage, setPage, totalPages, slice, pageSize };
}
