-- Break sites ↔ site_assignments RLS recursion; add resignation requests + membership display names

-- ---------------------------------------------------------------------------
-- RLS helpers (SECURITY DEFINER — bypass RLS on joined tables)
-- ---------------------------------------------------------------------------

create or replace function public.site_org_id(p_site_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from sites where id = p_site_id limit 1;
$$;

create or replace function public.user_has_site_assignment(p_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from site_assignments
    where site_id = p_site_id and user_id = auth.uid()
  );
$$;

drop policy if exists site_assignments_select on site_assignments;
drop policy if exists site_assignments_manage on site_assignments;

create policy site_assignments_select on site_assignments for select using (
  user_id = auth.uid()
  or public.is_org_owner(public.site_org_id(site_id))
);

create policy site_assignments_manage on site_assignments for all using (
  public.is_org_owner(public.site_org_id(site_id))
);

drop policy if exists sites_select on sites;

create policy sites_select on sites for select using (
  public.is_org_staff(organization_id)
  or public.user_has_site_assignment(id)
  or exists (
    select 1
    from units u
    join leases l on l.unit_id = u.id
    where u.site_id = sites.id
      and l.tenant_user_id = auth.uid()
      and l.status = 'active'
  )
);

-- ---------------------------------------------------------------------------
-- Membership display name + resignation workflow
-- ---------------------------------------------------------------------------

alter table memberships
  add column if not exists display_name text;

create type resignation_status as enum ('pending', 'accepted', 'rejected');

create table membership_resignations (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references memberships (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  reason text,
  status resignation_status not null default 'pending',
  responded_by uuid references auth.users (id),
  responded_at timestamptz,
  response_note text,
  created_at timestamptz not null default now()
);

create index membership_resignations_org_status_idx
  on membership_resignations (organization_id, status);

alter table membership_resignations enable row level security;

create policy resignations_select on membership_resignations for select using (
  user_id = auth.uid()
  or public.is_org_owner(organization_id)
);

create policy resignations_insert on membership_resignations for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from memberships m
    where m.id = membership_id
      and m.user_id = auth.uid()
      and m.organization_id = organization_id
      and m.role in ('manager', 'agent')
  )
);

create policy resignations_respond on membership_resignations for update using (
  public.is_org_owner(organization_id)
);
