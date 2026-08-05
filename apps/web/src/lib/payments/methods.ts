import type { PaymentMethod } from "@/types/database";

/** Methods a tenant can choose when uploading proof (always pending until verified). */
export const TENANT_PAYMENT_METHOD_OPTIONS: {
  value: Extract<PaymentMethod, "bank_transfer" | "cheque" | "cash">;
  label: string;
}[] = [
  { value: "bank_transfer", label: "Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
];

/** Methods staff can choose when recording a payment at the office (verified immediately). */
export const STAFF_RECORD_METHOD_OPTIONS: {
  value: Extract<PaymentMethod, "bank_transfer" | "cheque" | "cash_recorded">;
  label: string;
}[] = [
  { value: "bank_transfer", label: "Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "cash_recorded", label: "Cash" },
];

export function paymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    bank_transfer: "Transfer",
    cheque: "Cheque",
    cash: "Cash",
    cash_recorded: "Cash",
    dedicated_account: "Shop account",
    gateway_checkout: "Online",
  };
  return labels[method] ?? method.replace(/_/g, " ");
}

export function parseTenantPaymentMethod(
  raw: FormDataEntryValue | null
): Extract<PaymentMethod, "bank_transfer" | "cheque" | "cash"> {
  const value = String(raw ?? "bank_transfer");
  if (value === "cheque" || value === "cash") return value;
  return "bank_transfer";
}

export function parseStaffRecordPaymentMethod(
  raw: FormDataEntryValue | null
): Extract<PaymentMethod, "bank_transfer" | "cheque" | "cash_recorded"> {
  const value = String(raw ?? "bank_transfer");
  if (value === "cheque" || value === "cash_recorded") return value;
  return "bank_transfer";
}
