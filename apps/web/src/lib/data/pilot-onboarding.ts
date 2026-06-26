import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgProfile } from "@/lib/data/org-profile";

export type PilotOnboardingStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
  optional?: boolean;
};

export type PilotOnboardingStatus = {
  steps: PilotOnboardingStep[];
  completedCount: number;
  totalCount: number;
  allRequiredDone: boolean;
  dismissed: boolean;
};

function isDismissed(settings: unknown): boolean {
  if (!settings || typeof settings !== "object") return false;
  return Boolean((settings as { onboarding_dismissed?: boolean }).onboarding_dismissed);
}

export async function getPilotOnboardingStatus(
  orgId: string,
  orgSlug: string
): Promise<PilotOnboardingStatus> {
  const admin = createAdminClient();
  const profile = await getOrgProfile(orgId);

  const { data: sites } = await admin
    .from("sites")
    .select("id")
    .eq("organization_id", orgId);

  const siteIds = sites?.map((s) => s.id) ?? [];

  const { data: units } = await admin
    .from("units")
    .select("id")
    .eq("organization_id", orgId);

  const unitIds = units?.map((u) => u.id) ?? [];

  const [
    settlementResult,
    leaseResult,
    paymentResult,
    teamResult,
    orgResult,
  ] = await Promise.all([
    siteIds.length > 0
      ? admin
          .from("site_settlement_accounts")
          .select("id", { count: "exact", head: true })
          .in("site_id", siteIds)
      : Promise.resolve({ count: 0 }),
    unitIds.length > 0
      ? admin
          .from("leases")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .in("unit_id", unitIds)
      : Promise.resolve({ count: 0 }),
    admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("status", ["verified", "auto_matched"]),
    admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("role", ["manager", "agent"]),
    admin.from("organizations").select("settings").eq("id", orgId).maybeSingle(),
  ]);

  const profileDone = Boolean(
    profile?.companyName?.trim() || profile?.ownerDisplayName?.trim()
  );
  const hasProperty = siteIds.length > 0;
  const hasUnits = unitIds.length > 0;
  const hasSettlement = (settlementResult.count ?? 0) > 0;
  const hasLease = (leaseResult.count ?? 0) > 0;
  const hasPayment = (paymentResult.count ?? 0) > 0;
  const hasTeam = (teamResult.count ?? 0) > 0;

  const propertyHref = `/d/${orgSlug}/properties`;

  const steps: PilotOnboardingStep[] = [
    {
      id: "profile",
      title: "Set your company profile",
      description: "Add your name and company — tenants see this on letters and receipts.",
      href: `/d/${orgSlug}/settings`,
      done: profileDone,
    },
    {
      id: "property",
      title: "Add your first property",
      description: "Create a plaza, estate, or building you manage.",
      href: propertyHref,
      done: hasProperty,
    },
    {
      id: "units",
      title: "Add shops or units",
      description: "Register each shop, flat, or office inside your property.",
      href: propertyHref,
      done: hasUnits,
    },
    {
      id: "settlement",
      title: "Add a settlement bank account",
      description: "Tenants need your bank details to pay rent by transfer.",
      href: `/d/${orgSlug}/account`,
      done: hasSettlement,
    },
    {
      id: "lease",
      title: "Assign a tenant & set rent",
      description: "Open a unit, add tenant contact, annual rent, and billing cadence.",
      href: propertyHref,
      done: hasLease,
    },
    {
      id: "payment",
      title: "Record or verify first payment",
      description: "Record cash or verify a tenant receipt to update the ledger.",
      href: `/d/${orgSlug}/payments`,
      done: hasPayment,
    },
    {
      id: "team",
      title: "Invite a manager or agent",
      description: "Optional — share verification and day-to-day work.",
      href: `/d/${orgSlug}/users`,
      done: hasTeam,
      optional: true,
    },
  ];

  const required = steps.filter((s) => !s.optional);
  const completedCount = required.filter((s) => s.done).length;

  return {
    steps,
    completedCount,
    totalCount: required.length,
    allRequiredDone: completedCount === required.length,
    dismissed: isDismissed(orgResult.data?.settings),
  };
}
