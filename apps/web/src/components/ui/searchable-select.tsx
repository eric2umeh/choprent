"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Search } from "lucide-react";

export type SearchableOption = {
  value: string;
  label: string;
  hint?: string;
};

export function SearchableSelect({
  name,
  options,
  value,
  defaultValue = "",
  onValueChange,
  placeholder = "Search…",
  emptyLabel = "Select…",
  required,
  disabled,
  className,
}: {
  name: string;
  options: SearchableOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [internalValue, setInternalValue] = useState(defaultValue);

  const selectedValue = value ?? internalValue;
  const selected = options.find((o) => o.value === selectedValue);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          (o.hint?.toLowerCase().includes(q) ?? false) ||
          o.value.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [options, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(next: string) {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input type="hidden" name={name} value={selectedValue} required={required} />
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listId}
        className="input-field flex w-full items-center justify-between gap-2 text-left"
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span className={cn("truncate", !selected && "text-muted")}>
          {selected ? selected.label : emptyLabel}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {open && (
        <div
          id={listId}
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-white shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <input
              type="search"
              autoFocus
              className="w-full bg-transparent text-sm outline-none"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">No matches</li>
            ) : (
              filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-green-50",
                      o.value === selectedValue && "bg-green-50 font-medium text-green-900"
                    )}
                    onClick={() => pick(o.value)}
                  >
                    <span>{o.label}</span>
                    {o.hint && (
                      <span className="text-xs text-muted">{o.hint}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
          {options.length > 50 && !query && (
            <p className="border-t border-border px-3 py-1.5 text-xs text-muted">
              Type to search {options.length} items…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
