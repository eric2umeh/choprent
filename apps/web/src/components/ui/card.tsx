import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-white p-3 shadow-sm transition-shadow duration-200 hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="stat-card interactive-lift">
      <p className="text-stat-label">{label}</p>
      <p className="text-stat-value">{value}</p>
      {hint && <p className="text-stat-hint">{hint}</p>}
    </div>
  );
}

export function CompactCard({
  children,
  className,
  onClick,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        "interactive-lift rounded-xl border border-border bg-white p-2.5",
        onClick && "cursor-pointer hover:border-green-200 hover:bg-green-50/40 hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}
