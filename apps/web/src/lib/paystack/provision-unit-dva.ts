import { createAdminClient } from "@/lib/supabase/admin";
import {
  assignDedicatedAccount,
  createPaystackCustomer,
  isPaystackConfigured,
  mockDedicatedAccount,
  updatePaystackCustomer,
} from "@/lib/paystack/client";

export type VirtualAccountRow = {
  id: string;
  unitId: string;
  unitCode: string;
  propertyName: string;
  accountNumber: string;
  bankName: string;
  accountName: string;
  paystackCustomerCode: string | null;
  activeLeaseId: string | null;
};

export async function listVirtualAccountsForOrg(
  orgId: string
): Promise<VirtualAccountRow[]> {
  const admin = createAdminClient();
  const { data: units } = await admin
    .from("units")
    .select("id, unit_code, sites(name)")
    .eq("organization_id", orgId)
    .order("unit_code");

  if (!units?.length) return [];

  const unitIds = units.map((u) => u.id);
  const { data: vas } = await admin
    .from("virtual_accounts")
    .select("unit_id, account_number, bank_name, account_name, paystack_customer_code, active_lease_id")
    .in("unit_id", unitIds);

  const vaByUnit = new Map((vas ?? []).map((v) => [v.unit_id, v]));

  return units.map((u) => {
    const va = vaByUnit.get(u.id);
    const site = Array.isArray(u.sites) ? u.sites[0] : u.sites;
    return {
      id: va?.unit_id ?? u.id,
      unitId: u.id,
      unitCode: u.unit_code,
      propertyName: (site as { name?: string } | null)?.name ?? "Property",
      accountNumber: va?.account_number ?? "",
      bankName: va?.bank_name ?? "",
      accountName: va?.account_name ?? "",
      paystackCustomerCode: va?.paystack_customer_code ?? null,
      activeLeaseId: va?.active_lease_id ?? null,
    };
  });
}

export async function provisionUnitDva(
  orgId: string,
  unitId: string
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  const { data: unit } = await admin
    .from("units")
    .select("id, unit_code, organization_id, sites(name)")
    .eq("id", unitId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!unit) return { error: "Unit not found." };

  const { data: existing } = await admin
    .from("virtual_accounts")
    .select("id")
    .eq("unit_id", unitId)
    .maybeSingle();

  if (existing) return { error: "This unit already has a dedicated account." };

  const { data: lease } = await admin
    .from("leases")
    .select("id, tenant_display_name, tenant_email")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .maybeSingle();

  const tenantName = lease?.tenant_display_name ?? `Unit ${unit.unit_code}`;
  const site = Array.isArray(unit.sites) ? unit.sites[0] : unit.sites;
  const accountName = `${tenantName} — ${(site as { name?: string } | null)?.name ?? "Shop"}`;

  let customerCode: string;
  let dvaId: string;
  let accountNumber: string;
  let bankName: string;

  if (isPaystackConfigured()) {
    const email =
      lease?.tenant_email ??
      `unit+${unit.id.slice(0, 8)}@choprent-dva.local`;
    const customer = await createPaystackCustomer({
      email,
      firstName: tenantName.slice(0, 40),
      lastName: `Unit ${unit.unit_code}`,
      metadata: { unit_id: unitId, organization_id: orgId },
    });
    const dva = await assignDedicatedAccount(customer.customer_code);
    customerCode = customer.customer_code;
    dvaId = String(dva.id);
    accountNumber = dva.account_number;
    bankName = dva.bank.name;
  } else {
    const mock = mockDedicatedAccount(unitId, accountName);
    customerCode = mock.customer_code;
    dvaId = mock.dva_id;
    accountNumber = mock.account_number;
    bankName = mock.bank_name;
  }

  const { error } = await admin.from("virtual_accounts").insert({
    unit_id: unitId,
    paystack_customer_code: customerCode,
    paystack_dva_id: dvaId,
    account_number: accountNumber,
    bank_name: bankName,
    account_name: accountName,
    active_lease_id: lease?.id ?? null,
    provider: "paystack",
  });

  if (error) return { error: error.message };

  const { data: org } = await admin
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .maybeSingle();

  const settings = (org?.settings ?? {}) as Record<string, unknown>;
  await admin
    .from("organizations")
    .update({
      settings: {
        ...settings,
        payments: {
          ...((settings.payments as Record<string, unknown>) ?? {}),
          dva_enabled: true,
          auto_verify_dva: true,
        },
      },
    })
    .eq("id", orgId);

  return {};
}

export async function syncDvaAccountNameForUnit(unitId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: va } = await admin
    .from("virtual_accounts")
    .select("id, paystack_customer_code, account_name")
    .eq("unit_id", unitId)
    .maybeSingle();

  if (!va) return;

  const { data: lease } = await admin
    .from("leases")
    .select("id, tenant_display_name")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .maybeSingle();

  const tenantName = lease?.tenant_display_name ?? "Vacant";
  const accountName = va.account_name.replace(/^[^—]+/, tenantName);

  await admin
    .from("virtual_accounts")
    .update({
      account_name: accountName,
      active_lease_id: lease?.id ?? null,
    })
    .eq("id", va.id);

  if (isPaystackConfigured() && va.paystack_customer_code) {
    await updatePaystackCustomer(va.paystack_customer_code, {
      firstName: tenantName.slice(0, 40),
      lastName: "Shop",
    });
  }
}
