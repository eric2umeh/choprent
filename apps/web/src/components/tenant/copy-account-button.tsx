"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "@/components/ui/toast";

export function CopyAccountButton({ accountNumber }: { accountNumber: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      toast.success("Account number copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the number manually.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-green-700"
    >
      <Copy className="h-3.5 w-3.5" />
      {copied ? "Copied" : "Copy account number"}
    </button>
  );
}
