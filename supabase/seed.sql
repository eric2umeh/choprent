-- Dev seed — replace UUIDs after linking auth users in Supabase dashboard
-- Run only in local/staging: supabase db reset

insert into organizations (id, name, slug, settings)
values (
  '11111111-1111-1111-1111-111111111111',
  'Pilot Landlord Org',
  'pilot-plaza',
  '{"payments":{"dva_enabled":false,"fee_bearer":"undecided"}}'::jsonb
);

insert into sites (id, organization_id, name, site_type, address)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Sample Plaza',
  'plaza',
  '{"city":"Lagos","state":"LA","country":"NG"}'::jsonb
);

insert into site_settlement_accounts (site_id, bank_name, account_number, account_name, label, is_default)
values (
  '22222222-2222-2222-2222-222222222222',
  'GTBank',
  '0123456789',
  'Pilot Plaza Collections',
  'Main rent',
  true
);

insert into units (
  organization_id,
  site_id,
  unit_code,
  unit_code_normalized,
  is_composite,
  composite_note,
  property_type,
  status
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '14',
    public.normalize_unit_code('14'),
    false,
    null,
    'shop',
    'vacant'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '14/16',
    public.normalize_unit_code('14/16'),
    true,
    'Shops 14 and 16 combined',
    'shop',
    'vacant'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'Flat 3B',
    public.normalize_unit_code('Flat 3B'),
    false,
    null,
    'flat',
    'vacant'
  );

insert into charge_templates (
  organization_id,
  scope,
  scope_id,
  charge_kind,
  calculation,
  amount,
  percent_of,
  billing_period,
  effective_from,
  priority
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'property_type',
    null,
    'rent',
    'fixed',
    1200000,
    null,
    'annual',
    current_date,
    1
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'organization',
    null,
    'service',
    'percent',
    10,
    'base_rent',
    'annual',
    current_date,
    2
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'organization',
    null,
    'agency',
    'fixed',
    50000,
    null,
    'annual',
    current_date,
    3
  );
