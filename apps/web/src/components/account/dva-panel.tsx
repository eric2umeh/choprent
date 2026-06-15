export function DvaPanel() {
  return (
    <div className="space-y-3">
      <p className="text-list-secondary">
        Paystack dedicated virtual accounts (DVA) give each shop a stable NUBAN for
        automatic rent reconciliation.
      </p>
      <div className="rounded-xl border border-dashed border-border bg-surface-subtle px-4 py-6 text-center">
        <p className="text-sm font-medium text-foreground">Coming in Phase 1.5</p>
        <p className="mt-1 text-list-meta">
          Connect Paystack to issue one NUBAN per unit. Tenants transfer without
          uploading receipts.
        </p>
      </div>
    </div>
  );
}
