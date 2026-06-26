-- Sprint 9b — unit billing profiles for full charge engine

create table unit_billing_profiles (
  unit_id uuid primary key references units (id) on delete cascade,
  base_rent_ngn numeric(14, 2) not null default 0 check (base_rent_ngn >= 0),
  service_pct numeric(5, 2) not null default 0 check (service_pct >= 0),
  agency_fee_ngn numeric(14, 2) not null default 0 check (agency_fee_ngn >= 0),
  vat_pct numeric(5, 2) not null default 0 check (vat_pct >= 0),
  diesel_ngn numeric(14, 2) not null default 0 check (diesel_ngn >= 0),
  security_ngn numeric(14, 2) not null default 0 check (security_ngn >= 0),
  updated_at timestamptz not null default now()
);

alter table unit_billing_profiles enable row level security;

create policy unit_billing_profiles_select on unit_billing_profiles for select using (
  exists (
    select 1 from units u
    where u.id = unit_billing_profiles.unit_id
      and (
        public.is_org_staff(u.organization_id)
        or public.tenant_has_active_lease(u.id)
        or exists (
          select 1 from site_assignments sa
          where sa.site_id = u.site_id and sa.user_id = auth.uid()
        )
      )
  )
);

create policy unit_billing_profiles_manage on unit_billing_profiles for all using (
  exists (
    select 1 from units u
    where u.id = unit_billing_profiles.unit_id
      and public.is_org_owner(u.organization_id)
  )
);

create trigger unit_billing_profiles_updated_at
  before update on unit_billing_profiles
  for each row execute function public.set_updated_at();
