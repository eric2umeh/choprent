import type { BillingCadence } from "@/types/database";
import type { createAdminClient } from "@/lib/supabase/admin";
import {
  buildPeriodChargeLines,
  sumChargeLines,
  type UnitBillingProfile,
} from "@/lib/charges/billing-profile";
import { listBillingPeriods } from "@/lib/charges/period-ranges";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function saveUnitBillingProfile(
  admin: AdminClient,
  unitId: string,
  profile: UnitBillingProfile
): Promise<void> {
  await admin.from("unit_billing_profiles").upsert({
    unit_id: unitId,
    base_rent_ngn: profile.baseRentNgn,
    service_pct: profile.servicePct,
    agency_fee_ngn: profile.agencyFeeNgn,
    vat_pct: profile.vatPct,
    diesel_ngn: 0,
    security_ngn: 0,
  });
}

export async function loadUnitBillingProfile(
  admin: AdminClient,
  unitId: string
): Promise<UnitBillingProfile | null> {
  const { data } = await admin
    .from("unit_billing_profiles")
    .select(
      "base_rent_ngn, service_pct, agency_fee_ngn, vat_pct, diesel_ngn, security_ngn"
    )
    .eq("unit_id", unitId)
    .maybeSingle();

  if (!data) return null;
  return {
    baseRentNgn: Number(data.base_rent_ngn),
    servicePct: Number(data.service_pct),
    agencyFeeNgn: Number(data.agency_fee_ngn),
    vatPct: Number(data.vat_pct),
  };
}

/** Regenerate charge templates, ledger periods, and lines for an active lease. */
export async function generateLedgerForLease(
  admin: AdminClient,
  input: {
    orgId: string;
    unitId: string;
    leaseId: string;
    leaseStart: string;
    leaseEnd: string;
    cadence: BillingCadence;
    profile: UnitBillingProfile;
  }
): Promise<void> {
  const { orgId, unitId, leaseId, leaseStart, leaseEnd, cadence, profile } =
    input;

  if (profile.baseRentNgn <= 0 && sumChargeLines(buildPeriodChargeLines(profile, cadence, true)) <= 0) {
    return;
  }

  await saveUnitBillingProfile(admin, unitId, profile);

  await admin
    .from("charge_templates")
    .delete()
    .eq("organization_id", orgId)
    .eq("scope", "unit")
    .eq("scope_id", unitId);

  const templateIds = new Map<string, string>();
  const sampleLines = buildPeriodChargeLines(profile, cadence, true);
  for (const line of sampleLines) {
    const annualAmount =
      line.chargeKind === "rent"
        ? profile.baseRentNgn
        : line.chargeKind === "service"
          ? profile.baseRentNgn * (profile.servicePct / 100)
          : line.chargeKind === "agency"
            ? profile.agencyFeeNgn
            : 0;

    const { data: tpl } = await admin
      .from("charge_templates")
      .insert({
        organization_id: orgId,
        scope: "unit",
        scope_id: unitId,
        charge_kind: line.chargeKind,
        calculation: line.chargeKind === "service" || line.chargeKind === "vat" ? "percent" : "fixed",
        amount: line.chargeKind === "service" ? profile.servicePct : line.chargeKind === "vat" ? profile.vatPct : annualAmount,
        billing_period: cadence,
        effective_from: leaseStart,
        priority: line.priority,
      })
      .select("id")
      .single();

    if (tpl) templateIds.set(line.chargeKind, tpl.id);
  }

  const periods = listBillingPeriods(leaseStart, leaseEnd, cadence);
  const generatedStarts = new Set(periods.map((p) => p.periodStart));

  let isFirst = true;
  for (const periodRange of periods) {
    const lines = buildPeriodChargeLines(profile, cadence, isFirst);
    isFirst = false;
    const expectedTotal = sumChargeLines(lines);

    const { data: existing } = await admin
      .from("ledger_periods")
      .select("id, paid_total_ngn")
      .eq("unit_id", unitId)
      .eq("period_start", periodRange.periodStart)
      .eq("billing_cadence", cadence)
      .maybeSingle();

    const paidTotal = Number(existing?.paid_total_ngn ?? 0);

    const { data: period } = await admin
      .from("ledger_periods")
      .upsert(
        {
          unit_id: unitId,
          lease_id: leaseId,
          period_start: periodRange.periodStart,
          period_end: periodRange.periodEnd,
          billing_cadence: cadence,
          status: "open",
          expected_total_ngn: expectedTotal,
          paid_total_ngn: paidTotal,
          arrears_opening_ngn: 0,
          arrears_closing_ngn: Math.max(expectedTotal - paidTotal, 0),
        },
        { onConflict: "unit_id,period_start,billing_cadence" }
      )
      .select("id")
      .single();

    if (!period) continue;

    await admin.from("ledger_lines").delete().eq("ledger_period_id", period.id);

    if (lines.length > 0) {
      await admin.from("ledger_lines").insert(
        lines.map((line) => ({
          ledger_period_id: period.id,
          charge_template_id: templateIds.get(line.chargeKind) ?? null,
          description: `${line.description} · ${periodRange.periodLabel}`,
          amount_ngn: line.amountNgn,
          kind: "expected" as const,
        }))
      );
    }
  }

  const { data: stalePeriods } = await admin
    .from("ledger_periods")
    .select("id, paid_total_ngn")
    .eq("unit_id", unitId)
    .eq("status", "open");

  for (const stale of stalePeriods ?? []) {
    const { data: full } = await admin
      .from("ledger_periods")
      .select("period_start, billing_cadence, paid_total_ngn")
      .eq("id", stale.id)
      .maybeSingle();

    if (!full) continue;
    const keep =
      full.billing_cadence === cadence && generatedStarts.has(full.period_start);
    if (!keep && Number(full.paid_total_ngn) === 0) {
      await admin.from("ledger_lines").delete().eq("ledger_period_id", stale.id);
      await admin.from("ledger_periods").delete().eq("id", stale.id);
    }
  }
}

/** Remove ledger periods that no longer match the active lease billing schedule. */
export async function repairStaleLedgerPeriodsForUnit(
  admin: AdminClient,
  orgId: string,
  unitId: string
): Promise<boolean> {
  const { data: lease } = await admin
    .from("leases")
    .select("id, start_date, end_date, billing_cadence")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .maybeSingle();

  if (!lease) return false;

  const expected = listBillingPeriods(
    lease.start_date,
    lease.end_date,
    lease.billing_cadence
  );
  const expectedStarts = new Set(expected.map((p) => p.periodStart));

  const { data: openPeriods } = await admin
    .from("ledger_periods")
    .select("id, period_start, paid_total_ngn")
    .eq("unit_id", unitId)
    .eq("status", "open");

  const hasStale = (openPeriods ?? []).some(
    (p) => !expectedStarts.has(p.period_start)
  );

  if (!hasStale) return false;

  const profile = await loadUnitBillingProfile(admin, unitId);

  if (!profile || profile.baseRentNgn <= 0) {
    for (const period of openPeriods ?? []) {
      if (
        !expectedStarts.has(period.period_start) &&
        Number(period.paid_total_ngn) === 0
      ) {
        await admin
          .from("ledger_lines")
          .delete()
          .eq("ledger_period_id", period.id);
        await admin.from("ledger_periods").delete().eq("id", period.id);
      }
    }
    return true;
  }

  await generateLedgerForLease(admin, {
    orgId,
    unitId,
    leaseId: lease.id,
    leaseStart: lease.start_date,
    leaseEnd: lease.end_date,
    cadence: lease.billing_cadence,
    profile,
  });

  return true;
}

export async function regenerateLedgerForUnit(
  admin: AdminClient,
  orgId: string,
  unitId: string,
  profile?: UnitBillingProfile
): Promise<void> {
  const { data: lease } = await admin
    .from("leases")
    .select("id, start_date, end_date, billing_cadence")
    .eq("unit_id", unitId)
    .eq("status", "active")
    .maybeSingle();

  if (!lease) return;

  const billingProfile =
    profile ?? (await loadUnitBillingProfile(admin, unitId));
  if (!billingProfile || billingProfile.baseRentNgn <= 0) return;

  await generateLedgerForLease(admin, {
    orgId,
    unitId,
    leaseId: lease.id,
    leaseStart: lease.start_date,
    leaseEnd: lease.end_date,
    cadence: lease.billing_cadence,
    profile: billingProfile,
  });
}
