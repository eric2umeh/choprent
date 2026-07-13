-- Document categories, property scoping, expense attachments
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'tenancy_agreement';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'payment';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'issue';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'other';

ALTER TABLE management_documents
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_management_documents_site_id
  ON management_documents(site_id);

ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'government';

ALTER TABLE property_expenses
  ADD COLUMN IF NOT EXISTS attachment_url text;
