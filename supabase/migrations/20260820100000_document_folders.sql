-- Year-style folders for organizing tenant documents (staff only).

create table if not exists document_folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lease_id uuid not null references leases (id) on delete cascade,
  unit_id uuid references units (id) on delete set null,
  name text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint document_folders_name_not_blank check (length(trim(name)) > 0)
);

create unique index if not exists document_folders_lease_name_unique
  on document_folders (lease_id, lower(trim(name)));

create index if not exists idx_document_folders_lease_id
  on document_folders (lease_id);

create index if not exists idx_document_folders_org_id
  on document_folders (organization_id);

alter table management_documents
  add column if not exists folder_id uuid references document_folders (id) on delete set null;

create index if not exists idx_management_documents_folder_id
  on management_documents (folder_id);

alter table document_folders enable row level security;

drop policy if exists document_folders_select on document_folders;
create policy document_folders_select on document_folders for select using (
  public.is_org_staff(organization_id)
  or public.is_org_privileged(organization_id)
  or exists (
    select 1 from memberships m
    where m.organization_id = document_folders.organization_id
      and m.user_id = auth.uid()
      and m.role = 'agent'::membership_role
  )
);

drop policy if exists document_folders_manage on document_folders;
create policy document_folders_manage on document_folders for all using (
  public.is_org_privileged(organization_id)
  or public.is_org_manager(organization_id)
  or exists (
    select 1 from memberships m
    where m.organization_id = document_folders.organization_id
      and m.user_id = auth.uid()
      and m.role = 'agent'::membership_role
  )
);
