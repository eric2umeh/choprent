import { cn } from "@/lib/utils";

/** Constrains form width inside modals and pages — avoids full-bleed fields. */
export function FormPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("form-panel mx-auto w-full max-w-md space-y-4", className)}>{children}</div>;
}

export function SettingsSectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-card-title">{title}</h2>
          {description && (
            <p className="mt-1 text-list-secondary">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
