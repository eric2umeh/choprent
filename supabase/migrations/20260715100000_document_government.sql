-- Allow "government" as a management document category (e.g. AEPD)
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'government';
