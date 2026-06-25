-- Sprint 7: arrears reminder rules + Sprint 8: Paystack reference idempotency

create type reminder_channel as enum ('email', 'in_app', 'both');

create table reminder_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  days_after_due int not null check (days_after_due >= 0),
  channel reminder_channel not null default 'both',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, days_after_due)
);

create table reminder_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lease_id uuid not null references leases (id) on delete cascade,
  rule_id uuid not null references reminder_rules (id) on delete cascade,
  reminder_date date not null default current_date,
  sent_at timestamptz not null default now(),
  unique (lease_id, rule_id)
);

create index reminder_rules_org_idx on reminder_rules (organization_id) where enabled;
create index reminder_log_lease_idx on reminder_log (lease_id, reminder_date desc);

alter table reminder_rules enable row level security;
alter table reminder_log enable row level security;

create policy reminder_rules_select on reminder_rules for select using (
  public.is_org_staff(organization_id)
);

create policy reminder_rules_manage on reminder_rules for all using (
  public.is_org_owner(organization_id)
);

create policy reminder_log_select on reminder_log for select using (
  public.is_org_staff(organization_id)
);

-- Idempotent Paystack webhook inserts
create unique index payments_paystack_reference_unique
  on payments ((metadata->>'paystack_reference'))
  where metadata->>'paystack_reference' is not null;

-- Default reminder rule for existing orgs (7 days after arrears)
insert into reminder_rules (organization_id, days_after_due, channel, enabled)
select o.id, 7, 'both'::reminder_channel, true
from organizations o
on conflict (organization_id, days_after_due) do nothing;
