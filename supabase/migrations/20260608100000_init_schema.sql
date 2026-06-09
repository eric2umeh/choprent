-- ChopRent schema v1 — Sprint 0
-- Plaza → Unit, leases, charges, ledger, payments, documents, DVA (Phase 1.5), meters (Phase 2)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type membership_role as enum ('owner', 'manager', 'agent');
create type site_type as enum ('plaza', 'mall', 'estate', 'compound');
create type property_type as enum (
  'shop', 'flat', 'office', 'warehouse', 'kiosk', 'parking', 'restaurant', 'other'
);
create type unit_status as enum ('vacant', 'occupied', 'maintenance');
create type unit_component_relation as enum ('merged', 'adjacent');
create type billing_cadence as enum ('monthly', 'quarterly', 'annual');
create type lease_status as enum ('draft', 'active', 'ended', 'renewed');
create type charge_scope as enum ('organization', 'site', 'property_type', 'unit');
create type charge_kind as enum (
  'rent', 'service', 'agency', 'vat', 'diesel', 'security', 'deposit', 'other'
);
create type charge_calculation as enum ('fixed', 'percent');
create type charge_percent_of as enum ('base_rent', 'charge_id');
create type ledger_period_status as enum ('open', 'closed');
create type ledger_line_kind as enum ('expected', 'adjustment', 'waiver');
create type payment_method as enum (
  'bank_transfer', 'dedicated_account', 'cash_recorded', 'gateway_checkout'
);
create type payment_status as enum ('pending', 'auto_matched', 'verified', 'rejected');
create type document_type as enum ('letter', 'notice', 'receipt', 'statement');
create type virtual_account_provider as enum ('paystack');
create type meter_type as enum ('prepaid', 'postpaid');
create type meter_provider as enum ('internal', 'disco_api', 'aggregator');
create type utility_tx_status as enum ('pending', 'success', 'failed');

-- ---------------------------------------------------------------------------
-- Core org & plaza
-- ---------------------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  role membership_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  site_type site_type not null default 'plaza',
  address jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table site_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  site_id uuid not null references sites (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, site_id)
);

create table site_settlement_accounts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites (id) on delete cascade,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  label text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Units
-- ---------------------------------------------------------------------------

create table units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  site_id uuid not null references sites (id) on delete cascade,
  unit_code text not null,
  unit_code_normalized text not null,
  is_composite boolean not null default false,
  composite_note text,
  property_type property_type not null default 'shop',
  status unit_status not null default 'vacant',
  arrears_balance_ngn numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, unit_code)
);

create table unit_type_history (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units (id) on delete cascade,
  from_type property_type not null,
  to_type property_type not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users (id) on delete set null
);

create table unit_components (
  parent_unit_id uuid not null references units (id) on delete cascade,
  child_unit_id uuid not null references units (id) on delete cascade,
  relation unit_component_relation not null default 'merged',
  primary key (parent_unit_id, child_unit_id),
  check (parent_unit_id <> child_unit_id)
);

-- ---------------------------------------------------------------------------
-- Leases
-- ---------------------------------------------------------------------------

create table leases (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units (id) on delete cascade,
  tenant_user_id uuid references auth.users (id) on delete set null,
  tenant_display_name text not null,
  tenant_phone text,
  tenant_email text,
  start_date date not null,
  end_date date not null,
  billing_cadence billing_cadence not null default 'annual',
  status lease_status not null default 'draft',
  renewed_from_lease_id uuid references leases (id) on delete set null,
  settlement_account_id uuid references site_settlement_accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Charges & ledger
-- ---------------------------------------------------------------------------

create table charge_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  scope charge_scope not null,
  scope_id uuid,
  charge_kind charge_kind not null,
  calculation charge_calculation not null,
  amount numeric(14, 4) not null,
  percent_of charge_percent_of,
  percent_of_charge_id uuid references charge_templates (id) on delete set null,
  billing_period billing_cadence not null default 'annual',
  effective_from date not null,
  effective_to date,
  priority int not null default 0,
  created_at timestamptz not null default now()
);

create table ledger_periods (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units (id) on delete cascade,
  lease_id uuid references leases (id) on delete set null,
  period_start date not null,
  period_end date not null,
  billing_cadence billing_cadence not null,
  status ledger_period_status not null default 'open',
  expected_total_ngn numeric(14, 2) not null default 0,
  paid_total_ngn numeric(14, 2) not null default 0,
  arrears_opening_ngn numeric(14, 2) not null default 0,
  arrears_closing_ngn numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (unit_id, period_start, billing_cadence)
);

create table ledger_lines (
  id uuid primary key default gen_random_uuid(),
  ledger_period_id uuid not null references ledger_periods (id) on delete cascade,
  charge_template_id uuid references charge_templates (id) on delete set null,
  description text not null,
  amount_ngn numeric(14, 2) not null,
  kind ledger_line_kind not null default 'expected',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

create table payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  tenant_id uuid references auth.users (id) on delete set null,
  unit_id uuid not null references units (id) on delete cascade,
  ledger_period_id uuid references ledger_periods (id) on delete set null,
  amount_ngn numeric(14, 2) not null check (amount_ngn > 0),
  period_label text,
  payment_date date,
  bank_reference text,
  receipt_file_url text,
  payment_method payment_method not null default 'bank_transfer',
  status payment_status not null default 'pending',
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  rejection_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  ledger_period_id uuid not null references ledger_periods (id) on delete cascade,
  amount_ngn numeric(14, 2) not null check (amount_ngn > 0),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Documents, DVA, utilities, consent, notifications
-- ---------------------------------------------------------------------------

create table management_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  unit_id uuid references units (id) on delete cascade,
  lease_id uuid references leases (id) on delete set null,
  doc_type document_type not null,
  title text not null,
  file_url text not null,
  issued_at timestamptz not null default now(),
  issued_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table virtual_accounts (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null unique references units (id) on delete cascade,
  paystack_customer_code text,
  paystack_dva_id text,
  account_number text not null,
  bank_name text not null,
  account_name text not null,
  active_lease_id uuid references leases (id) on delete set null,
  provider virtual_account_provider not null default 'paystack',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table meters (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units (id) on delete cascade,
  meter_number text not null,
  disco_code text,
  meter_type meter_type not null default 'prepaid',
  provider meter_provider not null default 'internal',
  external_ref text,
  created_at timestamptz not null default now()
);

create table utility_transactions (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid not null references meters (id) on delete cascade,
  amount_ngn numeric(14, 2) not null,
  units_kwh numeric(12, 4),
  token text,
  status utility_tx_status not null default 'pending',
  provider_ref text,
  margin_ngn numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address inet
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references organizations (id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  snapshot_date date not null,
  units_registered int not null default 0,
  tenants_with_profiles int not null default 0,
  tenants_self_served int not null default 0,
  verified_payments_count int not null default 0,
  verified_total_ngn numeric(14, 2) not null default 0,
  collection_rate_pct numeric(5, 2),
  arrears_ngn numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, snapshot_date)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index idx_memberships_org on memberships (organization_id);
create index idx_memberships_user on memberships (user_id);
create index idx_sites_org on sites (organization_id);
create index idx_units_org_site on units (organization_id, site_id);
create index idx_units_code_norm on units (unit_code_normalized);
create index idx_leases_unit_status on leases (unit_id, status);
create index idx_leases_tenant on leases (tenant_user_id);
create index idx_payments_org_status on payments (organization_id, status, created_at desc);
create index idx_payments_unit on payments (unit_id);
create index idx_ledger_periods_unit on ledger_periods (unit_id, period_start);
create index idx_notifications_user on notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_updated_at
  before update on organizations
  for each row execute function public.set_updated_at();

create trigger sites_updated_at
  before update on sites
  for each row execute function public.set_updated_at();

create trigger units_updated_at
  before update on units
  for each row execute function public.set_updated_at();

create trigger leases_updated_at
  before update on leases
  for each row execute function public.set_updated_at();

create trigger virtual_accounts_updated_at
  before update on virtual_accounts
  for each row execute function public.set_updated_at();

create or replace function public.normalize_unit_code(raw text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(raw), '\s+', '', 'g'));
$$;

create or replace function public.user_org_role(org_id uuid)
returns membership_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from memberships
  where organization_id = org_id
    and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_org_owner(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where organization_id = org_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create or replace function public.is_org_manager(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where organization_id = org_id
      and user_id = auth.uid()
      and role = 'manager'
  );
$$;

create or replace function public.is_org_staff(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where organization_id = org_id
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  );
$$;

create or replace function public.can_verify_for_site(p_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from sites s
    join memberships m on m.organization_id = s.organization_id
    where s.id = p_site_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'manager')
  )
  or exists (
    select 1 from site_assignments sa
    where sa.site_id = p_site_id
      and sa.user_id = auth.uid()
  );
$$;

create or replace function public.tenant_has_active_lease(p_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from leases
    where unit_id = p_unit_id
      and tenant_user_id = auth.uid()
      and status = 'active'
  );
$$;

-- Realtime
alter publication supabase_realtime add table payments;
alter publication supabase_realtime add table units;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table ledger_periods;
