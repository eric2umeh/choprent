-- Sprint 7: tenant engagement events for self-service activity tracking

create type tenant_engagement_event as enum (
  'receipt_uploaded',
  'ledger_viewed',
  'document_downloaded',
  'statement_downloaded',
  'dva_payment_received'
);

create table tenant_engagement_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  tenant_user_id uuid references auth.users (id) on delete set null,
  lease_id uuid references leases (id) on delete set null,
  unit_id uuid references units (id) on delete set null,
  event_type tenant_engagement_event not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index tenant_engagement_events_org_created_idx
  on tenant_engagement_events (organization_id, created_at desc);

create index tenant_engagement_events_tenant_idx
  on tenant_engagement_events (tenant_user_id, event_type);

alter table tenant_engagement_events enable row level security;

create policy tenant_engagement_select on tenant_engagement_events for select using (
  public.user_org_role(organization_id) is not null
);

create policy tenant_engagement_insert on tenant_engagement_events for insert with check (
  tenant_user_id = auth.uid()
  or public.is_org_owner(organization_id)
  or public.user_org_role(organization_id) in ('owner', 'manager', 'agent')
);

alter publication supabase_realtime add table tenant_engagement_events;
