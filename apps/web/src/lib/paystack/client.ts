import { createHmac } from "crypto";

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

export type PaystackCustomer = {
  customer_code: string;
  email: string;
  first_name: string;
  last_name: string;
};

export type PaystackDedicatedAccount = {
  id: number;
  account_number: string;
  account_name: string;
  bank: { name: string; slug: string };
  customer: { customer_code: string };
};

function secretKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY ?? null;
}

export function isPaystackConfigured(): boolean {
  return !!secretKey();
}

/** Off by default until business licensing + Paystack onboarding. Set ENABLE_PAYSTACK_DVA=true to show DVA UI. */
export function isPaystackDvaEnabled(): boolean {
  return process.env.ENABLE_PAYSTACK_DVA === "true";
}

async function paystackFetch<T>(
  path: string,
  init?: RequestInit
): Promise<PaystackResponse<T>> {
  const key = secretKey();
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured.");

  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json()) as PaystackResponse<T>;
  if (!res.ok || !json.status) {
    throw new Error(json.message || `Paystack error ${res.status}`);
  }
  return json;
}

export async function createPaystackCustomer(input: {
  email: string;
  firstName: string;
  lastName: string;
  metadata?: Record<string, string>;
}): Promise<PaystackCustomer> {
  const { data } = await paystackFetch<PaystackCustomer>("/customer", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      metadata: input.metadata,
    }),
  });
  return data;
}

export async function updatePaystackCustomer(
  customerCode: string,
  input: { firstName?: string; lastName?: string }
): Promise<void> {
  await paystackFetch(`/customer/${customerCode}`, {
    method: "PUT",
    body: JSON.stringify({
      first_name: input.firstName,
      last_name: input.lastName,
    }),
  });
}

export async function assignDedicatedAccount(
  customerCode: string,
  preferredBank = "wema-bank"
): Promise<PaystackDedicatedAccount> {
  const { data } = await paystackFetch<PaystackDedicatedAccount>("/dedicated_account", {
    method: "POST",
    body: JSON.stringify({
      customer: customerCode,
      preferred_bank: preferredBank,
    }),
  });
  return data;
}

/** Dev fallback when Paystack keys are not set. */
export function mockDedicatedAccount(unitId: string, accountName: string) {
  const suffix = unitId.replace(/-/g, "").slice(0, 8);
  return {
    customer_code: `MOCK_CUS_${suffix}`,
    dva_id: `MOCK_DVA_${suffix}`,
    account_number: `9${suffix.padEnd(9, "0").slice(0, 9)}`,
    bank_name: "Mock Bank (dev)",
    account_name: accountName,
  };
}

export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  const key = secretKey();
  if (!key || !signature) return false;
  const hash = createHmac("sha512", key).update(rawBody).digest("hex");
  return hash === signature;
}
