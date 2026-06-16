"use client";

import { useState, useTransition } from "react";
import { exportPaymentsCsv, exportUnitsCsv } from "@/lib/actions/reports";
import { toast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { Download } from "lucide-react";

function triggerDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsExportButtons({ orgSlug }: { orgSlug: string }) {
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState<"payments" | "units" | null>(null);

  function handleExport(type: "payments" | "units") {
    setExporting(type);
    startTransition(async () => {
      const result =
        type === "payments"
          ? await exportPaymentsCsv(orgSlug)
          : await exportUnitsCsv(orgSlug);
      setExporting(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.csv && result.filename) {
        triggerDownload(result.csv, result.filename);
        toast.success(`${result.filename} downloaded.`);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => handleExport("payments")}
        className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 disabled:opacity-60"
      >
        {exporting === "payments" ? (
          <Spinner size="sm" className="text-white" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Payments CSV
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => handleExport("units")}
        className="btn-ghost inline-flex items-center gap-1.5 border border-border px-3 py-1.5 disabled:opacity-60"
      >
        {exporting === "units" ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
        Units CSV
      </button>
    </div>
  );
}
