-- Step 2: admin helpers + RLS (runs after enum value is committed).

create or replace function public.is_org_admin(org_id uuid)
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
      and role = 'admin'::membership_role
  );
$$;

create or replace function public.is_org_privileged(org_id uuid)
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
      and role in ('owner'::membership_role, 'admin'::membership_role)
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
      and role in (
        'owner'::membership_role,
        'admin'::membership_role,
        'manager'::membership_role
      )
  );
$$;

drop policy if exists sites_insert on sites;
create policy sites_insert on sites for insert with check (
  public.is_org_privileged(organization_id)
);

drop policy if exists sites_update on sites;
create policy sites_update on sites for update using (
  public.is_org_privileged(organization_id)
);

drop policy if exists sites_delete on sites;
create policy sites_delete on sites for delete using (
  public.is_org_privileged(organization_id)
);

drop policy if exists units_insert on units;
create policy units_insert on units for insert with check (
  public.is_org_privileged(organization_id)
);

drop policy if exists units_update on units;
create policy units_update on units for update using (
  public.is_org_privileged(organization_id) or public.is_org_manager(organization_id)
);

drop policy if exists units_delete on units;
create policy units_delete on units for delete using (
  public.is_org_privileged(organization_id)
);

drop policy if exists settlement_manage on site_settlement_accounts;
create policy settlement_manage on site_settlement_accounts for all using (
  exists (
    select 1 from sites s
    where s.id = site_settlement_accounts.site_id and public.is_org_privileged(s.organization_id)
  )
);

drop policy if exists site_assignments_manage on site_assignments;
create policy site_assignments_manage on site_assignments for all using (
  exists (
    select 1 from sites s
    where s.id = site_assignments.site_id and public.is_org_privileged(s.organization_id)
  )
);

drop policy if exists site_assignments_select on site_assignments;
create policy site_assignments_select on site_assignments for select using (
  user_id = auth.uid()
  or exists (
    select 1 from sites s
    where s.id = site_assignments.site_id and public.is_org_privileged(s.organization_id)
  )
);
