import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";

export default function TenantPayPage() {
  return (
    <div>
      <PageHeader
        title="Pay rent"
        description="Upload your bank transfer receipt for verification"
      />

      <Card className="rounded-none border-x-0 border-t-0 shadow-none">
        <div className="rounded-md border border-dashed border-green-300 bg-green-50/50 px-4 py-6 text-center">
          <Upload className="mx-auto h-8 w-8 text-green-600" />
          <p className="mt-2 text-sm font-medium text-foreground">
            Tap to upload receipt
          </p>
          <p className="mt-0.5 text-cell-muted">JPG, PNG or PDF · max 10MB</p>
          <button type="button" className="btn-primary mt-3 px-4 py-1.5">
            Choose file (mock)
          </button>
        </div>

        <form className="mt-4 space-y-3">
          <div>
            <label className="text-label normal-case">Amount paid (₦)</label>
            <input className="input-field mt-1" placeholder="680000" />
          </div>
          <div>
            <label className="text-label normal-case">Bank reference</label>
            <input className="input-field mt-1" placeholder="TRF-123456" />
          </div>
          <div>
            <label className="text-label normal-case">Payment date</label>
            <input className="input-field mt-1" type="date" />
          </div>
          <div>
            <label className="text-label normal-case">Period</label>
            <select className="input-field mt-1">
              <option>H2 2025</option>
              <option>Partial payment</option>
            </select>
          </div>
          <button type="button" className="btn-primary w-full py-2.5">
            Submit for verification (mock)
          </button>
        </form>
      </Card>

      <p className="px-3 py-3 text-center text-[11px] text-muted">
        Or pay directly to shop account 9876543210 — no upload needed.
      </p>
    </div>
  );
}
