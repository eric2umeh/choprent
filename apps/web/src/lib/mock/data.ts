import type { MembershipRole, PropertyType, UnitStatus } from "@/types/database";

export type MockRole = MembershipRole | "tenant";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: MockRole;
  initials: string;
}

export interface MockSite {
  id: string;
  name: string;
  address: string;
  unitCount: number;
}

export interface MockUnit {
  id: string;
  siteId: string;
  unitCode: string;
  propertyType: PropertyType;
  status: UnitStatus;
  tenantName: string | null;
  annualRent: number;
  arrears: number;
  isComposite: boolean;
  virtualAccount: string | null;
}

export interface MockLease {
  id: string;
  unitId: string;
  unitCode: string;
  tenantName: string;
  tenantPhone: string;
  startDate: string;
  endDate: string;
  billingCadence: "monthly" | "quarterly" | "annual";
  status: "active" | "ended" | "draft";
  annualTotal: number;
}

export interface MockPayment {
  id: string;
  unitId: string;
  unitCode: string;
  tenantName: string;
  amount: number;
  periodLabel: string;
  paymentDate: string;
  method: "bank_transfer" | "cash_recorded" | "dedicated_account";
  status: "pending" | "verified" | "rejected";
  bankReference: string | null;
}

export interface MockDocument {
  id: string;
  title: string;
  docType: "letter" | "notice" | "receipt" | "statement";
  unitCode: string | null;
  issuedAt: string;
}

export interface MockLedgerLine {
  id: string;
  description: string;
  amount: number;
  kind: "charge" | "payment" | "arrears";
  date: string;
}

export interface MockOrg {
  slug: string;
  name: string;
  sites: MockSite[];
}

export const MOCK_ORG: MockOrg = {
  slug: "pilot-plaza",
  name: "Pilot Landlord Org",
  sites: [
    {
      id: "site-1",
      name: "Eri Plaza",
      address: "12 Allen Avenue, Ikeja, Lagos",
      unitCount: 6,
    },
  ],
};

export const MOCK_USERS: Record<MockRole, MockUser> = {
  owner: {
    id: "user-owner",
    name: "Eri Landlord",
    email: "eri@pilotplaza.ng",
    role: "owner",
    initials: "EL",
  },
  manager: {
    id: "user-manager",
    name: "Ada Manager",
    email: "ada@pilotplaza.ng",
    role: "manager",
    initials: "AM",
  },
  agent: {
    id: "user-agent",
    name: "Tunde Agent",
    email: "tunde@pilotplaza.ng",
    role: "agent",
    initials: "TA",
  },
  tenant: {
    id: "user-tenant",
    name: "Chidi Traders Ltd",
    email: "chidi@traders.ng",
    role: "tenant",
    initials: "CT",
  },
};

export const MOCK_UNITS: MockUnit[] = [
  {
    id: "unit-1",
    siteId: "site-1",
    unitCode: "14",
    propertyType: "shop",
    status: "occupied",
    tenantName: "Chidi Traders Ltd",
    annualRent: 1200000,
    arrears: 0,
    isComposite: false,
    virtualAccount: "9876543210",
  },
  {
    id: "unit-2",
    siteId: "site-1",
    unitCode: "14/16",
    propertyType: "shop",
    status: "occupied",
    tenantName: "Bola Fashion",
    annualRent: 2400000,
    arrears: 450000,
    isComposite: true,
    virtualAccount: "9876543211",
  },
  {
    id: "unit-3",
    siteId: "site-1",
    unitCode: "Flat 3B",
    propertyType: "flat",
    status: "occupied",
    tenantName: "Mr. Okonkwo",
    annualRent: 850000,
    arrears: 0,
    isComposite: false,
    virtualAccount: null,
  },
  {
    id: "unit-4",
    siteId: "site-1",
    unitCode: "22",
    propertyType: "restaurant",
    status: "vacant",
    tenantName: null,
    annualRent: 1500000,
    arrears: 0,
    isComposite: false,
    virtualAccount: null,
  },
  {
    id: "unit-5",
    siteId: "site-1",
    unitCode: "Office 4",
    propertyType: "office",
    status: "occupied",
    tenantName: "Legal Partners",
    annualRent: 980000,
    arrears: 120000,
    isComposite: false,
    virtualAccount: "9876543212",
  },
  {
    id: "unit-6",
    siteId: "site-1",
    unitCode: "Kiosk 1",
    propertyType: "kiosk",
    status: "maintenance",
    tenantName: null,
    annualRent: 350000,
    arrears: 0,
    isComposite: false,
    virtualAccount: null,
  },
];

export const MOCK_LEASES: MockLease[] = [
  {
    id: "lease-1",
    unitId: "unit-1",
    unitCode: "14",
    tenantName: "Chidi Traders Ltd",
    tenantPhone: "+2348012345678",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    billingCadence: "annual",
    status: "active",
    annualTotal: 1380000,
  },
  {
    id: "lease-2",
    unitId: "unit-2",
    unitCode: "14/16",
    tenantName: "Bola Fashion",
    tenantPhone: "+2348098765432",
    startDate: "2024-06-01",
    endDate: "2025-05-31",
    billingCadence: "annual",
    status: "active",
    annualTotal: 2760000,
  },
  {
    id: "lease-3",
    unitId: "unit-3",
    unitCode: "Flat 3B",
    tenantName: "Mr. Okonkwo",
    tenantPhone: "+2347011122233",
    startDate: "2025-03-01",
    endDate: "2026-02-28",
    billingCadence: "annual",
    status: "active",
    annualTotal: 935000,
  },
];

export const MOCK_PAYMENTS: MockPayment[] = [
  {
    id: "pay-1",
    unitId: "unit-1",
    unitCode: "14",
    tenantName: "Chidi Traders Ltd",
    amount: 690000,
    periodLabel: "H1 2025",
    paymentDate: "2025-06-08",
    method: "bank_transfer",
    status: "pending",
    bankReference: "TRF-CHIDI-080625",
  },
  {
    id: "pay-2",
    unitId: "unit-2",
    unitCode: "14/16",
    tenantName: "Bola Fashion",
    amount: 500000,
    periodLabel: "Partial · Arrears",
    paymentDate: "2025-06-07",
    method: "dedicated_account",
    status: "pending",
    bankReference: "DVA-8877665544",
  },
  {
    id: "pay-3",
    unitId: "unit-5",
    unitCode: "Office 4",
    tenantName: "Legal Partners",
    amount: 980000,
    periodLabel: "Annual 2025",
    paymentDate: "2025-06-01",
    method: "cash_recorded",
    status: "verified",
    bankReference: null,
  },
  {
    id: "pay-4",
    unitId: "unit-3",
    unitCode: "Flat 3B",
    tenantName: "Mr. Okonkwo",
    amount: 467500,
    periodLabel: "H1 2025",
    paymentDate: "2025-05-28",
    method: "bank_transfer",
    status: "verified",
    bankReference: "GTB-5544332211",
  },
];

export const MOCK_DOCUMENTS: MockDocument[] = [
  {
    id: "doc-1",
    title: "Rent demand notice — Shop 14",
    docType: "notice",
    unitCode: "14",
    issuedAt: "2025-06-01",
  },
  {
    id: "doc-2",
    title: "Statement H1 2025 — Flat 3B",
    docType: "statement",
    unitCode: "Flat 3B",
    issuedAt: "2025-05-30",
  },
  {
    id: "doc-3",
    title: "Management letter — Plaza rules",
    docType: "letter",
    unitCode: null,
    issuedAt: "2025-01-15",
  },
];

export const MOCK_TENANT_LEDGER: MockLedgerLine[] = [
  {
    id: "l-1",
    description: "Annual rent 2025",
    amount: 1200000,
    kind: "charge",
    date: "2025-01-01",
  },
  {
    id: "l-2",
    description: "Service charge (10%)",
    amount: 120000,
    kind: "charge",
    date: "2025-01-01",
  },
  {
    id: "l-3",
    description: "Agency fee",
    amount: 50000,
    kind: "charge",
    date: "2025-01-01",
  },
  {
    id: "l-4",
    description: "Payment — GTB ref (verified)",
    amount: -690000,
    kind: "payment",
    date: "2025-03-15",
  },
  {
    id: "l-5",
    description: "Balance due H2 2025",
    amount: 680000,
    kind: "arrears",
    date: "2025-06-08",
  },
];

export const MOCK_STATS = {
  collected: 4200000,
  expected: 5380000,
  collectionRate: 78,
  arrears: 570000,
  pendingVerifications: 2,
  occupiedUnits: 4,
  totalUnits: 6,
  vacantUnits: 1,
};

export const PROPERTY_TYPES: PropertyType[] = [
  "shop",
  "flat",
  "office",
  "warehouse",
  "kiosk",
  "parking",
  "restaurant",
  "other",
];

export function getMockUser(role: MockRole): MockUser {
  return MOCK_USERS[role];
}

export function getUnitById(id: string): MockUnit | undefined {
  return MOCK_UNITS.find((u) => u.id === id);
}

export function formatPropertyType(type: PropertyType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
