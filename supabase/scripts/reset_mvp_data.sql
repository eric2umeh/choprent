-- ChopRent MVP data reset — wipes ALL app data for a fresh pilot.
-- Keeps schema, RLS, migrations, and storage buckets.
-- Run: npm run db:reset-mvp  (or supabase db query --linked -f supabase/scripts/reset_mvp_data.sql)

begin;

-- Storage files cleared separately via: supabase storage rm -r --linked ss:///receipts ss:///documents

-- App tables (children first; CASCADE handles leftovers)
truncate table
  payment_attachments,
  payment_allocations,
  reminder_log,
  tenant_engagement_events,
  membership_resignations,
  notifications,
  user_consents,
  utility_transactions,
  ledger_lines,
  payments,
  ledger_periods,
  charge_templates,
  unit_billing_profiles,
  management_documents,
  virtual_accounts,
  meters,
  property_expenses,
  reminder_rules,
  metrics_snapshots,
  leases,
  unit_components,
  unit_type_history,
  units,
  site_settlement_accounts,
  site_assignments,
  sites,
  memberships,
  organizations
restart identity cascade;

-- Auth users (landlords, managers, tenants) — fresh sign-up required
delete from auth.users;

commit;
