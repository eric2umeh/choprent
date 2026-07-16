-- Tenant portal invite links sent by staff for a specific lease/email
create table if not exists tenant_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete cascade,
  email text not null,
  token text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tenant_invites_lease_id_idx on tenant_invites(lease_id);
create index if not exists tenant_invites_email_idx on tenant_invites(lower(email));
create index if not exists tenant_invites_token_idx on tenant_invites(token);

alter table tenant_invites enable row level security;
