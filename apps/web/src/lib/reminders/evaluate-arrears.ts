import { createAdminClient } from "@/lib/supabase/admin";
import { formatNaira } from "@/lib/auth/roles";
import { sendEmail, arrearsReminderEmailHtml } from "@/lib/email/send";

export type ArrearsReminderCandidate = {
  leaseId: string;
  unitId: string;
  unitCode: string;
  tenantUserId: string | null;
  tenantName: string;
  tenantEmail: string | null;
  orgId: string;
  orgSlug: string;
  orgName: string;
  balance: number;
  ruleId: string;
  daysAfterDue: number;
};

export async function listArrearsReminderCandidates(): Promise<ArrearsReminderCandidate[]> {
  const admin = createAdminClient();

  const { data: rules } = await admin
    .from("reminder_rules")
    .select("id, organization_id, days_after_due, organizations(name, slug)")
    .eq("enabled", true);

  if (!rules?.length) return [];

  const candidates: ArrearsReminderCandidate[] = [];

  for (const rule of rules) {
    const orgRaw = rule.organizations;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    if (!org || typeof org !== "object" || !("slug" in org)) continue;

    const { data: leases } = await admin
      .from("leases")
      .select(
        "id, tenant_user_id, tenant_display_name, tenant_email, units!inner(id, unit_code, arrears_balance_ngn, organization_id)"
      )
      .eq("status", "active")
      .eq("units.organization_id", rule.organization_id);

    for (const lease of leases ?? []) {
      const unit = Array.isArray(lease.units) ? lease.units[0] : lease.units;
      if (!unit) continue;

      const balance = Number(unit.arrears_balance_ngn ?? 0);
      if (balance <= 0) continue;

      const { data: alreadySent } = await admin
        .from("reminder_log")
        .select("id")
        .eq("lease_id", lease.id)
        .eq("rule_id", rule.id)
        .maybeSingle();

      if (alreadySent) continue;

      candidates.push({
        leaseId: lease.id,
        unitId: unit.id,
        unitCode: unit.unit_code,
        tenantUserId: lease.tenant_user_id,
        tenantName: lease.tenant_display_name,
        tenantEmail: lease.tenant_email,
        orgId: rule.organization_id,
        orgSlug: String(org.slug),
        orgName: String(org.name),
        balance,
        ruleId: rule.id,
        daysAfterDue: rule.days_after_due,
      });
    }
  }

  return candidates;
}

export async function sendArrearsReminders(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const candidates = await listArrearsReminderCandidates();
  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const c of candidates) {
    const title = `Rent reminder — Unit ${c.unitCode}`;
    const body = `Outstanding balance: ${formatNaira(c.balance)}. Please pay or upload your receipt.`;

    try {
      if (c.tenantUserId) {
        await admin.from("notifications").insert({
          user_id: c.tenantUserId,
          organization_id: c.orgId,
          title,
          body,
          metadata: { lease_id: c.leaseId, unit_id: c.unitId, type: "arrears_reminder" },
        });
      }

      if (c.tenantEmail) {
        const emailResult = await sendEmail({
          to: c.tenantEmail,
          subject: title,
          html: arrearsReminderEmailHtml({
            tenantName: c.tenantName,
            unitCode: c.unitCode,
            balance: c.balance,
            orgName: c.orgName,
            portalUrl: `${appUrl}/t/${c.orgSlug}/pay`,
          }),
        });
        if (!emailResult.ok) {
          errors.push(`${c.tenantEmail}: ${emailResult.error}`);
        }
      }

      await admin.from("reminder_log").insert({
        organization_id: c.orgId,
        lease_id: c.leaseId,
        rule_id: c.ruleId,
      });

      sent++;
    } catch (err) {
      skipped++;
      errors.push(
        err instanceof Error ? err.message : `Failed for lease ${c.leaseId}`
      );
    }
  }

  return { sent, skipped, errors };
}
