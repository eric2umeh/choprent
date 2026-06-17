-- Sprint 6 — Property expenses for P&L and analytics

create type expense_category as enum (
  'maintenance',
  'diesel',
  'security',
  'agency',
  'cleaning',
  'repairs',
  'utilities',
  'other'
);

create table property_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  site_id uuid not null references sites (id) on delete cascade,
  category expense_category not null default 'other',
  description text not null,
  amount_ngn numeric(14, 2) not null check (amount_ngn >= 0),
  expense_date date not null default current_date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index property_expenses_org_date_idx
  on property_expenses (organization_id, expense_date desc);

create index property_expenses_site_date_idx
  on property_expenses (site_id, expense_date desc);

alter table property_expenses enable row level security;

create policy property_expenses_select on property_expenses for select using (
  public.is_org_staff(organization_id)
  or exists (
    select 1 from site_assignments sa
    where sa.site_id = property_expenses.site_id and sa.user_id = auth.uid()
  )
);

create policy property_expenses_manage on property_expenses for all using (
  public.is_org_owner(organization_id) or public.is_org_manager(organization_id)
);

alter publication supabase_realtime add table property_expenses;
