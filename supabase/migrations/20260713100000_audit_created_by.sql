-- Track who created leases, units, and payment submissions.

alter table units
  add column if not exists created_by uuid references auth.users (id) on delete set null;

alter table leases
  add column if not exists created_by uuid references auth.users (id) on delete set null;

alter table payments
  add column if not exists recorded_by uuid references auth.users (id) on delete set null;

create index if not exists units_created_by_idx on units (created_by);
create index if not exists leases_created_by_idx on leases (created_by);
create index if not exists payments_recorded_by_idx on payments (recorded_by);
