export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in mb-3 flex flex-col gap-2 border-b border-border bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-page-title">{title}</h1>
        {description && <p className="text-page-desc mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function ListPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden border-y border-border bg-white animate-fade-in">
      {children}
    </div>
  );
}

export function ListToolbar({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border bg-white px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
      {children}
    </div>
  );
}
