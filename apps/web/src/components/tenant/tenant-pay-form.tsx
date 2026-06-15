"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitTransferPayment } from "@/lib/actions/tenant-payments";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";
import { Upload } from "lucide-react";

export function TenantPayForm({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await submitTransferPayment(orgSlug, {}, formData);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Receipt submitted — management will verify shortly.");
    e.currentTarget.reset();
    setFileName(null);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block cursor-pointer rounded-md border border-dashed border-green-300 bg-green-50/50 px-4 py-6 text-center">
        <Upload className="mx-auto h-8 w-8 text-green-600" />
        <p className="mt-2 text-sm font-medium text-foreground">
          {fileName ?? "Tap to upload receipt"}
        </p>
        <p className="mt-0.5 text-cell-muted">JPG, PNG or PDF · max 10MB</p>
        <input
          type="file"
          name="receipt"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          disabled={loading}
          onChange={(ev) => setFileName(ev.target.files?.[0]?.name ?? null)}
        />
      </label>

      <div>
        <label className="text-label normal-case">Amount paid (₦)</label>
        <input
          name="amount_ngn"
          type="number"
          min={1}
          required
          disabled={loading}
          className="input-field mt-1"
          placeholder="680000"
        />
      </div>
      <div>
        <label className="text-label normal-case">Bank reference</label>
        <input
          name="bank_reference"
          disabled={loading}
          className="input-field mt-1"
          placeholder="TRF-123456"
        />
      </div>
      <div>
        <label className="text-label normal-case">Period (optional)</label>
        <input
          name="period_label"
          disabled={loading}
          className="input-field mt-1"
          placeholder="2026 partial"
        />
      </div>

      <LoadingButton
        type="submit"
        loading={loading}
        loadingLabel="Submitting…"
        className="btn-primary w-full py-2.5 disabled:opacity-60"
      >
        Submit for verification
      </LoadingButton>
    </form>
  );
}
