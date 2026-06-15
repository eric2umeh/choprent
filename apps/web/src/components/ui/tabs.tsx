"use client";

import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-border bg-white px-3",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative shrink-0 px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "text-green-800"
                : "text-muted hover:text-foreground"
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-green-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("animate-fade-in bg-white px-3 py-4", className)}>
      {children}
    </div>
  );
}
