-- Portal-linked tenants: auth users linked to active leases via tenant_user_id.
-- Staff UI and reporting query this view (service role / admin client).

create or replace view public.portal_tenant_accounts
with (security_invoker = true)
as
select
  l.tenant_user_id as user_id,
  u.organization_id,
  l.id as lease_id,
  l.unit_id,
  l.tenant_display_name,
  l.tenant_email,
  l.tenant_phone,
  l.start_date,
  l.end_date,
  l.billing_cadence,
  l.status as lease_status,
  u.unit_code,
  s.id as site_id,
  s.name as site_name,
  s.slug as site_slug,
  l.created_at as lease_created_at,
  (
    select ti.accepted_at
    from tenant_invites ti
    where ti.lease_id = l.id
      and ti.accepted_at is not null
    order by ti.accepted_at desc
    limit 1
  ) as invite_accepted_at,
  (
    select ti.created_at
    from tenant_invites ti
    where ti.lease_id = l.id
    order by ti.created_at desc
    limit 1
  ) as last_invite_sent_at
from leases l
join units u on u.id = l.unit_id
join sites s on s.id = u.site_id
where l.tenant_user_id is not null
  and l.status = 'active';

comment on view public.portal_tenant_accounts is
  'Active leases linked to a ChopRent auth user (tenant portal signup).';

grant select on public.portal_tenant_accounts to authenticated;
grant select on public.portal_tenant_accounts to service_role;
