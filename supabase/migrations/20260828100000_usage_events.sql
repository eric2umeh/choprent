-- Client usage signals (PWA install, standalone sessions, sign-ins).

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  user_agent text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint usage_events_type_not_blank check (length(trim(event_type)) > 0)
);

create index if not exists idx_usage_events_org_created
  on usage_events (organization_id, created_at desc);

create index if not exists idx_usage_events_type_created
  on usage_events (event_type, created_at desc);

create index if not exists idx_usage_events_user_created
  on usage_events (user_id, created_at desc);

alter table usage_events enable row level security;

drop policy if exists usage_events_select on usage_events;
create policy usage_events_select on usage_events for select using (
  public.is_org_privileged(organization_id)
);

drop policy if exists usage_events_insert on usage_events;
create policy usage_events_insert on usage_events for insert with check (
  user_id = auth.uid()
  and (
    public.is_org_staff(organization_id)
    or exists (
      select 1 from leases l
      join units u on u.id = l.unit_id
      where l.tenant_user_id = auth.uid()
        and u.organization_id = usage_events.organization_id
        and l.status = 'active'
    )
  )
);
