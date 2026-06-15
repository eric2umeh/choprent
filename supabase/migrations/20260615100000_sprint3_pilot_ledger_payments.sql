-- Sprint 3: pilot charge template, lease, ledger, arrears, allocation function

-- ---------------------------------------------------------------------------
-- Charge template — annual shop rent (pilot)
-- ---------------------------------------------------------------------------

insert into charge_templates (
  id,
  organization_id,
  scope,
  scope_id,
  charge_kind,
  calculation,
  amount,
  billing_period,
  effective_from,
  priority
)
values (
  '55555555-5555-5555-5555-555555555501',
  '11111111-1111-1111-1111-111111111111',
  'organization',
  null,
  'rent',
  'fixed',
  1200000,
  'annual',
  '2026-01-01',
  10
)
on conflict (id) do nothing;

-- Service charge 10% of rent (simplified — applied as fixed in seed ledger)
insert into charge_templates (
  id,
  organization_id,
  scope,
  scope_id,
  charge_kind,
  calculation,
  amount,
  billing_period,
  effective_from,
  priority
)
values (
  '55555555-5555-5555-5555-555555555502',
  '11111111-1111-1111-1111-111111111111',
  'organization',
  null,
  'service',
  'fixed',
  120000,
  'annual',
  '2026-01-01',
  20
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Active lease — unit 14
-- ---------------------------------------------------------------------------

insert into leases (
  id,
  unit_id,
  tenant_display_name,
  tenant_phone,
  tenant_email,
  start_date,
  end_date,
  billing_cadence,
  status,
  settlement_account_id
)
values (
  '66666666-6666-6666-6666-666666666601',
  '44444444-4444-4444-4444-444444444401',
  'Adaobi Trading Co.',
  '+2348012345678',
  'adaobi.trading@example.com',
  '2026-01-01',
  '2026-12-31',
  'annual',
  'active',
  '33333333-3333-3333-3333-333333333333'
)
on conflict (id) do update set
  tenant_display_name = excluded.tenant_display_name,
  status = excluded.status;

-- ---------------------------------------------------------------------------
-- Ledger period 2026 — unit 14
-- ---------------------------------------------------------------------------

insert into ledger_periods (
  id,
  unit_id,
  lease_id,
  period_start,
  period_end,
  billing_cadence,
  status,
  expected_total_ngn,
  paid_total_ngn,
  arrears_opening_ngn,
  arrears_closing_ngn
)
values (
  '77777777-7777-7777-7777-777777777701',
  '44444444-4444-4444-4444-444444444401',
  '66666666-6666-6666-6666-666666666601',
  '2026-01-01',
  '2026-12-31',
  'annual',
  'open',
  1320000,
  0,
  0,
  0
)
on conflict (unit_id, period_start, billing_cadence) do update set
  expected_total_ngn = excluded.expected_total_ngn;

insert into ledger_lines (id, ledger_period_id, charge_template_id, description, amount_ngn, kind)
values
  (
    '88888888-8888-8888-8888-888888888801',
    '77777777-7777-7777-7777-777777777701',
    '55555555-5555-5555-5555-555555555501',
    'Annual rent 2026',
    1200000,
    'expected'
  ),
  (
    '88888888-8888-8888-8888-888888888802',
    '77777777-7777-7777-7777-777777777701',
    '55555555-5555-5555-5555-555555555502',
    'Service charge 2026',
    120000,
    'expected'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Opening arrears — unit 16 (no active ledger period yet)
-- ---------------------------------------------------------------------------

update units
set arrears_balance_ngn = 450000,
    status = 'occupied'
where id = '44444444-4444-4444-4444-444444444404';

insert into leases (
  id,
  unit_id,
  tenant_display_name,
  tenant_phone,
  start_date,
  end_date,
  billing_cadence,
  status,
  settlement_account_id
)
values (
  '66666666-6666-6666-6666-666666666602',
  '44444444-4444-4444-4444-444444444404',
  'Emeka Stores',
  '+2348098765432',
  '2025-01-01',
  '2025-12-31',
  'annual',
  'active',
  '33333333-3333-3333-3333-333333333333'
)
on conflict (id) do nothing;

-- Sample pending transfer — unit 14 (for verify queue demo)
insert into payments (
  id,
  organization_id,
  tenant_id,
  unit_id,
  ledger_period_id,
  amount_ngn,
  period_label,
  payment_date,
  bank_reference,
  payment_method,
  status
)
values (
  '99999999-9999-9999-9999-999999999901',
  '11111111-1111-1111-1111-111111111111',
  null,
  '44444444-4444-4444-4444-444444444401',
  '77777777-7777-7777-7777-777777777701',
  500000,
  '2026 partial',
  '2026-06-01',
  'TRF-ADAOBI-500K',
  'bank_transfer',
  'pending'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Allocate verified payment — oldest arrears first, then ledger periods
-- ---------------------------------------------------------------------------

create or replace function public.allocate_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments%rowtype;
  v_remaining numeric(14, 2);
  v_arrears numeric(14, 2);
  v_apply numeric(14, 2);
  v_period record;
  v_owed numeric(14, 2);
begin
  select * into v_payment from payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;

  if v_payment.status not in ('verified', 'auto_matched') then
    raise exception 'Payment must be verified before allocation';
  end if;

  if exists (select 1 from payment_allocations where payment_id = p_payment_id) then
    return;
  end if;

  v_remaining := v_payment.amount_ngn;

  -- 1) Unit-level arrears bucket (oldest debt)
  select arrears_balance_ngn into v_arrears
  from units where id = v_payment.unit_id for update;

  if v_arrears > 0 and v_remaining > 0 then
    v_apply := least(v_remaining, v_arrears);
    update units
    set arrears_balance_ngn = arrears_balance_ngn - v_apply,
        updated_at = now()
    where id = v_payment.unit_id;
    v_remaining := v_remaining - v_apply;
  end if;

  -- 2) Open ledger periods oldest first
  for v_period in
    select lp.*
    from ledger_periods lp
    where lp.unit_id = v_payment.unit_id
      and lp.status = 'open'
      and (lp.expected_total_ngn + lp.arrears_opening_ngn - lp.paid_total_ngn) > 0
    order by lp.period_start asc
  loop
    exit when v_remaining <= 0;
    v_owed := v_period.expected_total_ngn + v_period.arrears_opening_ngn - v_period.paid_total_ngn;
    v_apply := least(v_remaining, v_owed);

    insert into payment_allocations (payment_id, ledger_period_id, amount_ngn)
    values (p_payment_id, v_period.id, v_apply);

    update ledger_periods
    set paid_total_ngn = paid_total_ngn + v_apply,
        arrears_closing_ngn = greatest(
          expected_total_ngn + arrears_opening_ngn - paid_total_ngn - v_apply,
          0
        )
    where id = v_period.id;

    v_remaining := v_remaining - v_apply;
  end loop;

  -- 3) Overpayment credit in metadata
  if v_remaining > 0 then
    update payments
    set metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('unallocated_credit_ngn', v_remaining)
    where id = p_payment_id;
  end if;
end;
$$;
