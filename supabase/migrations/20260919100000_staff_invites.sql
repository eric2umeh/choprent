-- Staff invite links (admin/manager/agent) sent by landlord or admin
create table if not exists staff_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'manager', 'agent')),
  token text not null unique,
  site_ids uuid[] not null default '{}',
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists staff_invites_org_id_idx on staff_invites(organization_id);
create index if not exists staff_invites_email_idx on staff_invites(lower(email));
create index if not exists staff_invites_token_idx on staff_invites(token);

alter table staff_invites enable row level security;
