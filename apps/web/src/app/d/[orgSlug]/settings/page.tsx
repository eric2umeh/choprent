import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { MOCK_ORG } from "@/lib/mock/data";

export default function SettingsPage() {
  const site = MOCK_ORG.sites[0];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Organization and plaza configuration"
      />

      <div className="space-y-0">
        <Card className="rounded-none border-x-0 border-t-0 shadow-none">
          <h2 className="text-sm font-semibold text-foreground">Plaza</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-label normal-case">Plaza name</label>
              <input className="input-field mt-1" defaultValue={site.name} />
            </div>
            <div>
              <label className="text-label normal-case">Address</label>
              <input className="input-field mt-1" defaultValue={site.address} />
            </div>
            <button type="button" className="btn-primary px-3 py-1.5">
              Save (mock)
            </button>
          </div>
        </Card>

        <Card className="rounded-none border-x-0 border-t-0 shadow-none">
          <h2 className="text-sm font-semibold text-foreground">
            Settlement accounts
          </h2>
          <div className="mt-3 rounded-md border border-border bg-surface-subtle px-3 py-2.5">
            <p className="text-sm font-medium text-foreground">GTBank · Main rent</p>
            <p className="text-cell-muted">0123456789 · Pilot Plaza Collections</p>
            <span className="mt-1.5 inline-flex rounded-md bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
              Default
            </span>
          </div>
          <button type="button" className="btn-ghost mt-3 px-3 py-1.5">
            Add account (mock)
          </button>
        </Card>

        <Card className="rounded-none border-x-0 border-t-0 shadow-none">
          <h2 className="text-sm font-semibold text-foreground">Paystack DVA</h2>
          <p className="mt-1 text-cell-muted">
            Phase 1.5 — dedicated virtual accounts per unit. Fee bearer: undecided.
          </p>
          <button type="button" className="btn-primary mt-3 px-3 py-1.5" disabled>
            Connect Paystack (coming soon)
          </button>
        </Card>
      </div>
    </div>
  );
}
