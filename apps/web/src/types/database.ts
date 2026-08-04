/** ChopRent domain enums — mirrors supabase/migrations enums */

export type MembershipRole = "owner" | "admin" | "manager" | "agent";
export type PropertyType =
  | "shop"
  | "flat"
  | "office"
  | "warehouse"
  | "kiosk"
  | "parking"
  | "restaurant"
  | "other";
export type UnitStatus = "vacant" | "occupied" | "maintenance";
export type BillingCadence = "monthly" | "quarterly" | "annual";
export type PaymentStatus = "pending" | "auto_matched" | "verified" | "rejected";
export type PaymentMethod =
  | "bank_transfer"
  | "dedicated_account"
  | "cash_recorded"
  | "gateway_checkout";

export type ExpenseCategory =
  | "maintenance"
  | "diesel"
  | "security"
  | "agency"
  | "cleaning"
  | "repairs"
  | "utilities"
  | "government"
  | "other";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface Site {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  site_type: "plaza" | "mall" | "estate" | "compound" | "house";
  address: Record<string, unknown>;
}

export interface Unit {
  id: string;
  organization_id: string;
  site_id: string;
  unit_code: string;
  unit_code_normalized: string;
  is_composite: boolean;
  composite_note: string | null;
  property_type: PropertyType;
  status: UnitStatus;
  arrears_balance_ngn: number;
  settlement_account_id?: string | null;
}

export interface Lease {
  id: string;
  unit_id: string;
  tenant_user_id: string | null;
  tenant_display_name: string;
  tenant_phone: string | null;
  tenant_email: string | null;
  start_date: string;
  end_date: string;
  billing_cadence: BillingCadence;
  status: "draft" | "active" | "ended" | "renewed";
}

export interface Payment {
  id: string;
  organization_id: string;
  tenant_id: string | null;
  unit_id: string;
  amount_ngn: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  period_label: string | null;
  bank_reference: string | null;
  receipt_file_url: string | null;
  verified_at: string | null;
  created_at: string;
}

/** Regenerate from Supabase CLI: npm run db:types */
export type Database = {
  public: {
    Tables: {
      organizations: { Row: Organization };
      sites: { Row: Site };
      units: { Row: Unit };
      leases: { Row: Lease };
      payments: { Row: Payment };
    };
  };
};
