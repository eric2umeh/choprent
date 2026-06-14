-- Sprint 1: allow tenants with active leases to read org + site metadata

drop policy if exists org_select on organizations;

create policy org_select on organizations for select using (
  public.is_org_staff(id)
  or exists (
    select 1 from memberships m
    where m.organization_id = organizations.id and m.user_id = auth.uid()
  )
  or exists (
    select 1
    from units u
    join leases l on l.unit_id = u.id
    where u.organization_id = organizations.id
      and l.tenant_user_id = auth.uid()
      and l.status = 'active'
  )
);

drop policy if exists sites_select on sites;

create policy sites_select on sites for select using (
  public.is_org_staff(organization_id)
  or exists (
    select 1 from site_assignments sa
    where sa.site_id = sites.id and sa.user_id = auth.uid()
  )
  or exists (
    select 1
    from units u
    join leases l on l.unit_id = u.id
    where u.site_id = sites.id
      and l.tenant_user_id = auth.uid()
      and l.status = 'active'
  )
);
