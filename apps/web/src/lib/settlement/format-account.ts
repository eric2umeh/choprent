export type SettlementAccountItem = {
  id: string;
  siteId: string;
  propertyName: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  label: string;
  isDefault: boolean;
};

/** Bank · account number · company / account name */
export function formatSettlementAccountLabel(a: {
  bankName: string;
  accountNumber: string;
  accountName: string;
}): string {
  return `${a.bankName} · ${a.accountNumber} · ${a.accountName}`;
}
