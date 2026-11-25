-- Cut Supabase Logs Ingest volume:
-- 1) Persist file sizes so list pages stop calling Storage on every load
-- 2) Quiet noisy statement logging on API roles

alter table management_documents
  add column if not exists file_size_bytes bigint;

alter table payment_attachments
  add column if not exists file_size_bytes bigint;

alter table payments
  add column if not exists receipt_file_size_bytes bigint;

alter table property_expenses
  add column if not exists attachment_size_bytes bigint;

comment on column management_documents.file_size_bytes is
  'Cached object size in bytes; avoids Storage list lookups on document pages.';
comment on column payment_attachments.file_size_bytes is
  'Cached receipt attachment size in bytes.';
comment on column payments.receipt_file_size_bytes is
  'Cached primary receipt size in bytes.';
comment on column property_expenses.attachment_size_bytes is
  'Cached expense attachment size in bytes.';

-- API traffic roles: do not log every statement (defaults can be very noisy).
-- Keep duration logging only for slow queries (>= 2s).
alter role authenticated set log_statement = 'none';
alter role anon set log_statement = 'none';
alter role service_role set log_statement = 'none';
alter role authenticator set log_statement = 'none';

alter role authenticated set log_min_duration_statement = 2000;
alter role anon set log_min_duration_statement = 2000;
alter role service_role set log_min_duration_statement = 2000;
alter role authenticator set log_min_duration_statement = 2000;

-- Dashboard / migrations role: keep ddl logging, only log slow statements.
alter role postgres set log_min_duration_statement = 2000;

-- Apply role config to PostgREST workers.
notify pgrst, 'reload config';
