export type ReceiptOcrResult = {
  amount?: number;
  bankReference?: string;
  paymentDate?: string;
  rawText: string;
  confidence: "low" | "medium";
};

/** Parse common Nigerian bank receipt patterns from OCR text. */
export function parseReceiptText(rawText: string): Omit<ReceiptOcrResult, "rawText" | "confidence"> {
  const text = rawText.replace(/\s+/g, " ");

  let amount: number | undefined;
  const amountPatterns = [
    /(?:amount|amt|paid|transfer|naira|ngn)[:\s]*(?:₦|NGN|N)?\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:₦|NGN)\s*([\d,]+(?:\.\d{2})?)/i,
    /\b([\d]{1,3}(?:,\d{3})+(?:\.\d{2})?)\b/,
  ];
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const parsed = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(parsed) && parsed >= 100) {
        amount = parsed;
        break;
      }
    }
  }

  let bankReference: string | undefined;
  const refPatterns = [
    /(?:ref(?:erence)?|txn|transaction|session)[:\s#]*([A-Z0-9-]{6,32})/i,
    /\b(TRF[A-Z0-9-]{4,24})\b/i,
    /\b([0-9]{10,16})\b/,
  ];
  for (const pattern of refPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      bankReference = match[1];
      break;
    }
  }

  let paymentDate: string | undefined;
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,
  ];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const parsed = new Date(match[1]);
      if (!Number.isNaN(parsed.getTime())) {
        paymentDate = parsed.toISOString().slice(0, 10);
      }
      break;
    }
  }

  return { amount, bankReference, paymentDate };
}

/** Run on-device OCR on a receipt image (JPG/PNG/WebP). PDFs are skipped. */
export async function extractReceiptFields(file: File): Promise<ReceiptOcrResult> {
  if (file.type === "application/pdf") {
    return { rawText: "", confidence: "low" };
  }

  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    const parsed = parseReceiptText(text);
    const hasFields = !!(parsed.amount || parsed.bankReference || parsed.paymentDate);
    return {
      ...parsed,
      rawText: text.slice(0, 2000),
      confidence: hasFields ? "medium" : "low",
    };
  } finally {
    await worker.terminate();
  }
}
