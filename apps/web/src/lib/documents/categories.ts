import type { DocumentType } from "@/lib/data/documents";

export const DOCUMENT_CATEGORY_OPTIONS: {
  value: DocumentType;
  label: string;
}[] = [
  { value: "tenancy_agreement", label: "Tenancy agreement" },
  { value: "receipt", label: "Receipt" },
  { value: "letter", label: "Letter" },
  { value: "payment", label: "Payment" },
  { value: "maintenance", label: "Maintenance" },
  { value: "issue", label: "Issue" },
  { value: "notice", label: "Notice" },
  { value: "other", label: "Other" },
];

const LABELS: Record<string, string> = {
  tenancy_agreement: "Tenancy agreement",
  receipt: "Receipt",
  letter: "Letter",
  payment: "Payment",
  maintenance: "Maintenance",
  issue: "Issue",
  notice: "Notice",
  other: "Other",
  statement: "Statement",
  attachment: "Attachment",
};

export function formatDocumentCategory(docType: DocumentType | string): string {
  return LABELS[docType] ?? docType.replace(/_/g, " ");
}

const VALID_TYPES = new Set<string>([
  ...DOCUMENT_CATEGORY_OPTIONS.map((o) => o.value),
  "statement",
  "attachment",
]);

export function parseDocumentType(value: string): DocumentType {
  if (VALID_TYPES.has(value)) return value as DocumentType;
  return "other";
}
