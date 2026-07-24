-- Auto-renew: when true (default), lease end_date rolls forward automatically.
-- When false, staff must renew manually after the fixed end date.

alter table leases
  add column if not exists auto_renew boolean not null default true;

comment on column leases.auto_renew is
  'When true, tenancy renews automatically past end_date. When false, end_date is fixed and staff must renew manually.';

create index if not exists leases_auto_renew_active_idx
  on leases (status, auto_renew, end_date)
  where status = 'active';
