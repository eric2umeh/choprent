"use client";

import { cn } from "@/lib/utils";
import { LayoutGrid, Table2 } from "lucide-react";

export type ViewMode = "table" | "card";

export function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-white p-0.5">
      <button
        type="button"
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
          value === "table"
            ? "bg-green-100 text-green-800"
            : "text-muted hover:text-foreground"
        )}
        aria-pressed={value === "table"}
      >
        <Table2 className="h-3.5 w-3.5" />
        Table
      </button>
      <button
        type="button"
        onClick={() => onChange("card")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
          value === "card"
            ? "bg-green-100 text-green-800"
            : "text-muted hover:text-foreground"
        )}
        aria-pressed={value === "card"}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Cards
      </button>
    </div>
  );
}
