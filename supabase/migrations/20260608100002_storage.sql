-- Storage buckets for receipts and management documents

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'receipts',
    'receipts',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'documents',
    'documents',
    false,
    20971520,
    array['application/pdf', 'image/jpeg', 'image/png']
  )
on conflict (id) do nothing;

-- Receipts: tenants upload to org/unit path; staff read org prefix
create policy receipts_select on storage.objects for select using (
  bucket_id = 'receipts'
  and (
    exists (
      select 1 from memberships m
      where m.user_id = auth.uid()
        and (storage.foldername(name))[1] = m.organization_id::text
    )
    or exists (
      select 1 from leases l
      join units u on u.id = l.unit_id
      where l.tenant_user_id = auth.uid()
        and l.status = 'active'
        and (storage.foldername(name))[1] = u.organization_id::text
        and (storage.foldername(name))[2] = u.id::text
    )
  )
);

create policy receipts_insert on storage.objects for insert with check (
  bucket_id = 'receipts'
  and (
    exists (
      select 1 from leases l
      join units u on u.id = l.unit_id
      where l.tenant_user_id = auth.uid()
        and l.status = 'active'
        and (storage.foldername(name))[1] = u.organization_id::text
        and (storage.foldername(name))[2] = u.id::text
    )
    or exists (
      select 1 from memberships m
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
        and (storage.foldername(name))[1] = m.organization_id::text
    )
  )
);

-- Documents: staff manage; tenants read own unit paths
create policy documents_storage_select on storage.objects for select using (
  bucket_id = 'documents'
  and (
    exists (
      select 1 from memberships m
      where m.user_id = auth.uid()
        and (storage.foldername(name))[1] = m.organization_id::text
    )
    or exists (
      select 1 from leases l
      join units u on u.id = l.unit_id
      where l.tenant_user_id = auth.uid()
        and l.status = 'active'
        and (storage.foldername(name))[1] = u.organization_id::text
        and (storage.foldername(name))[2] = u.id::text
    )
  )
);

create policy documents_storage_insert on storage.objects for insert with check (
  bucket_id = 'documents'
  and exists (
    select 1 from memberships m
    where m.user_id = auth.uid()
      and m.role in ('owner', 'manager')
      and (storage.foldername(name))[1] = m.organization_id::text
  )
);
