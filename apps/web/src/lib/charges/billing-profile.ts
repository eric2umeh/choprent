import type { BillingCadence } from "@/types/database";

export type UnitBillingProfile = {
  baseRentNgn: number;
  servicePct: number;
  agencyFeeNgn: number;
  vatPct: number;
  dieselNgn: number;
  securityNgn: number;
};

export const EMPTY_BILLING_PROFILE: UnitBillingProfile = {
  baseRentNgn: 0,
  servicePct: 0,
  agencyFeeNgn: 0,
  vatPct: 0,
  dieselNgn: 0,
  securityNgn: 0,
};

export function parseBillingProfileFromForm(formData: FormData): UnitBillingProfile {
  const num = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return 0;
    const v = Number(raw);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  };

  return {
    baseRentNgn: num("base_rent_ngn") || num("annual_rent_ngn"),
    servicePct: num("service_pct"),
    agencyFeeNgn: num("agency_fee_ngn"),
    vatPct: num("vat_pct"),
    dieselNgn: num("diesel_ngn"),
    securityNgn: num("security_ngn"),
  };
}

export function periodsPerYear(cadence: BillingCadence): number {
  if (cadence === "quarterly") return 4;
  if (cadence === "monthly") return 12;
  return 1;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export type ChargeLineDraft = {
  chargeKind: string;
  description: string;
  amountNgn: number;
  priority: number;
};

export function buildPeriodChargeLines(
  profile: UnitBillingProfile,
  cadence: BillingCadence,
  isFirstPeriod: boolean
): ChargeLineDraft[] {
  const div = periodsPerYear(cadence);
  const rent = profile.baseRentNgn / div;
  const service = rent * (profile.servicePct / 100);
  const agency = profile.agencyFeeNgn / div;
  const diesel = profile.dieselNgn / div;
  const security = isFirstPeriod ? profile.securityNgn : 0;
  const taxable = rent + service + agency + diesel + security;
  const vat = taxable * (profile.vatPct / 100);

  const lines: ChargeLineDraft[] = [];

  if (rent > 0) {
    lines.push({
      chargeKind: "rent",
      description: cadence === "annual" ? "Annual rent" : "Rent",
      amountNgn: roundMoney(rent),
      priority: 10,
    });
  }
  if (service > 0) {
    lines.push({
      chargeKind: "service",
      description: `Service charge (${profile.servicePct}%)`,
      amountNgn: roundMoney(service),
      priority: 20,
    });
  }
  if (agency > 0) {
    lines.push({
      chargeKind: "agency",
      description: "Agency fee",
      amountNgn: roundMoney(agency),
      priority: 30,
    });
  }
  if (diesel > 0) {
    lines.push({
      chargeKind: "diesel",
      description: "Diesel / generator",
      amountNgn: roundMoney(diesel),
      priority: 40,
    });
  }
  if (security > 0) {
    lines.push({
      chargeKind: "security",
      description: "Security deposit",
      amountNgn: roundMoney(security),
      priority: 50,
    });
  }
  if (vat > 0) {
    lines.push({
      chargeKind: "vat",
      description: `VAT (${profile.vatPct}%)`,
      amountNgn: roundMoney(vat),
      priority: 60,
    });
  }

  return lines;
}

export function sumChargeLines(lines: ChargeLineDraft[]): number {
  return roundMoney(lines.reduce((s, l) => s + l.amountNgn, 0));
}
