-- Optional unit on expenses; accept all document uploads; attachment doc type

alter table property_expenses
  add column if not exists unit_id uuid references units (id) on delete set null;

create index if not exists property_expenses_unit_date_idx
  on property_expenses (unit_id, expense_date desc)
  where unit_id is not null;

alter type document_type add value if not exists 'attachment';

-- Allow any file type in storage buckets (was blocking some PNG/WebP uploads)
update storage.buckets
set allowed_mime_types = null
where id in ('documents', 'receipts');
