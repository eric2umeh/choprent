-- Sprint 1: pilot plaza org (slug matches UI demo: pilot-plaza)
-- Idempotent — safe to re-run on environments missing seed data

insert into organizations (id, name, slug, settings)
values (
  '11111111-1111-1111-1111-111111111111',
  'Pilot Landlord Org',
  'pilot-plaza',
  '{"payments":{"dva_enabled":false,"fee_bearer":"undecided"}}'::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  settings = excluded.settings;

insert into sites (id, organization_id, name, site_type, address)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Eri Plaza',
  'plaza',
  '{"line1":"12 Allen Avenue","city":"Ikeja","state":"Lagos","country":"NG"}'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address;

insert into site_settlement_accounts (id, site_id, bank_name, account_number, account_name, label, is_default)
values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'GTBank',
  '0123456789',
  'Pilot Plaza Collections',
  'Main rent',
  true
)
on conflict (id) do nothing;

insert into units (
  id,
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
    '44444444-4444-4444-4444-444444444401',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '14',
    public.normalize_unit_code('14'),
    false,
    null,
    'shop',
    'occupied'
  ),
  (
    '44444444-4444-4444-4444-444444444402',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '14/16',
    public.normalize_unit_code('14/16'),
    true,
    'Shops 14 and 16 combined',
    'shop',
    'occupied'
  ),
  (
    '44444444-4444-4444-4444-444444444403',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'Flat 3B',
    public.normalize_unit_code('Flat 3B'),
    false,
    null,
    'flat',
    'vacant'
  ),
  (
    '44444444-4444-4444-4444-444444444404',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '16',
    public.normalize_unit_code('16'),
    false,
    null,
    'shop',
    'maintenance'
  )
on conflict (site_id, unit_code) do update set
  property_type = excluded.property_type,
  status = excluded.status,
  is_composite = excluded.is_composite,
  composite_note = excluded.composite_note;

-- Trigger for unit_code_normalized on insert (belt-and-braces)
create or replace function public.units_set_normalized_code()
returns trigger
language plpgsql
as $$
begin
  new.unit_code_normalized := public.normalize_unit_code(new.unit_code);
  new.is_composite := coalesce(new.is_composite, new.unit_code ~ '[/&]');
  return new;
end;
$$;

drop trigger if exists units_set_normalized on units;
create trigger units_set_normalized
  before insert or update of unit_code on units
  for each row execute function public.units_set_normalized_code();
