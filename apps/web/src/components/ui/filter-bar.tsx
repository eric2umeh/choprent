"use client";

import { Search } from "lucide-react";

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  children,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="filter-toolbar flex flex-col gap-2 border-b border-border px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[0.625rem] border border-border bg-surface-subtle px-2.5 py-[0.4375rem] transition-[border-color,background,box-shadow] focus-within:border-green-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(34,197,94,0.12),0_1px_2px_rgba(0,0,0,0.04)] sm:max-w-xs">
        <Search
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-[0.8125rem] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-label hidden sm:inline">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-field min-w-[7rem] font-medium text-foreground"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
