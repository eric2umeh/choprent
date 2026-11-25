-- Run in Supabase Dashboard → SQL Editor if the migration was not applied remotely yet.
-- Safe to re-run.

-- Inspect current role overrides
select rolname, rolconfig
from pg_roles
where rolname in ('anon', 'authenticated', 'authenticator', 'service_role', 'postgres');

alter role authenticated set log_statement = 'none';
alter role anon set log_statement = 'none';
alter role service_role set log_statement = 'none';
alter role authenticator set log_statement = 'none';

alter role authenticated set log_min_duration_statement = 2000;
alter role anon set log_min_duration_statement = 2000;
alter role service_role set log_min_duration_statement = 2000;
alter role authenticator set log_min_duration_statement = 2000;
alter role postgres set log_min_duration_statement = 2000;

notify pgrst, 'reload config';

-- Optional: also ensure size columns exist
alter table management_documents add column if not exists file_size_bytes bigint;
alter table payment_attachments add column if not exists file_size_bytes bigint;
alter table payments add column if not exists receipt_file_size_bytes bigint;
alter table property_expenses add column if not exists attachment_size_bytes bigint;
