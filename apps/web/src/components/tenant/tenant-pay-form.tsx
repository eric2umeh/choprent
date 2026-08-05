"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitTransferPayment } from "@/lib/actions/tenant-payments";
import { extractReceiptFields } from "@/lib/ocr/extract-receipt-fields";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { TENANT_PAYMENT_METHOD_OPTIONS } from "@/lib/payments/methods";
import { Upload } from "lucide-react";

export function TenantPayForm({
  orgSlug,
  unitCode,
  tenantName,
}: {
  orgSlug: string;
  unitCode?: string;
  tenantName?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [ocrHint, setOcrHint] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [period, setPeriod] = useState("");
  const [ocrPayload, setOcrPayload] = useState("");

  async function handleFilesChange(fileList: FileList | null) {
    if (!fileList?.length) {
      setFileNames([]);
      setOcrPayload("");
      return;
    }
    const files = Array.from(fileList);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} must be 10MB or less.`);
        return;
      }
    }
    setFileNames(files.map((f) => f.name));
    setOcrHint(null);

    const firstImage = files.find((f) => f.type.startsWith("image/"));
    if (!firstImage) {
      setOcrHint("Documents uploaded — enter amount and reference manually.");
      setOcrPayload("");
      return;
    }

    setScanning(true);
    try {
      const result = await extractReceiptFields(firstImage);
      if (result.amount) setAmount(String(result.amount));
      if (result.bankReference) setBankRef(result.bankReference);
      if (result.paymentDate) setPeriod(result.paymentDate);
      setOcrPayload(
        JSON.stringify({
          amount: result.amount,
          bankReference: result.bankReference,
          paymentDate: result.paymentDate,
          confidence: result.confidence,
        })
      );
      if (result.amount || result.bankReference) {
        setOcrHint("Fields pre-filled from first image — please review before submitting.");
      } else {
        setOcrHint("Could not read receipt clearly — enter details manually.");
      }
    } catch {
      setOcrHint("OCR unavailable — enter details manually.");
      setOcrPayload("");
    } finally {
      setScanning(false);
    }
  }

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
    setFileNames([]);
    setOcrHint(null);
    setAmount("");
    setBankRef("");
    setPeriod("");
    setOcrPayload("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block cursor-pointer rounded-md border border-dashed border-green-300 bg-green-50/50 px-4 py-6 text-center">
        {scanning ? (
          <Spinner className="mx-auto h-8 w-8 text-green-600" />
        ) : (
          <Upload className="mx-auto h-8 w-8 text-green-600" />
        )}
        <p className="mt-2 text-sm font-medium text-foreground">
          {fileNames.length > 0
            ? `${fileNames.length} file${fileNames.length === 1 ? "" : "s"} selected`
            : "Tap to upload proof of payment"}
        </p>
        <p className="mt-0.5 text-cell-muted">
          JPG, PNG or PDF · multiple files · OCR on first image
        </p>
        <input
          type="file"
          name="receipts"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          required
          disabled={loading || scanning}
          onChange={(ev) => {
            void handleFilesChange(ev.target.files);
          }}
        />
      </label>

      {ocrHint && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900">
          {ocrHint}
        </p>
      )}

      <input type="hidden" name="ocr_payload" value={ocrPayload} />

      <div>
        <label className="text-label normal-case">Payment method</label>
        <select
          name="payment_method"
          className="input-field mt-1"
          defaultValue="bank_transfer"
          disabled={loading || scanning}
        >
          {TENANT_PAYMENT_METHOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-label normal-case">Amount paid (₦)</label>
        <input
          name="amount_ngn"
          type="number"
          step="any"
          required
          disabled={loading || scanning}
          className="input-field mt-1"
          placeholder="680000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div>
        <label className="text-label normal-case">Bank reference</label>
        <input
          name="bank_reference"
          disabled={loading || scanning}
          className="input-field mt-1"
          placeholder="TRF-123456"
          value={bankRef}
          onChange={(e) => setBankRef(e.target.value)}
        />
      </div>
      <div>
        <label className="text-label normal-case">Period (optional)</label>
        <input
          name="period_label"
          disabled={loading || scanning}
          className="input-field mt-1"
          placeholder="2026 partial"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
      </div>

      <div>
        <label className="text-label normal-case">Note (optional)</label>
        <textarea
          name="payment_note"
          rows={2}
          disabled={loading || scanning}
          className="input-field mt-1 resize-none"
          placeholder={
            unitCode
              ? `e.g. Shop ${unitCode} Rent`
              : tenantName
                ? `e.g. ${tenantName} Rent`
                : "e.g. Shop 30 Rent"
          }
        />
      </div>

      <LoadingButton
        type="submit"
        loading={loading}
        loadingLabel="Submitting…"
        className="btn-primary w-full py-2.5 disabled:opacity-60"
        disabled={scanning}
      >
        Submit for verification
      </LoadingButton>
    </form>
  );
}
