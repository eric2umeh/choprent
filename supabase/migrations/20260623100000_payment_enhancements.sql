-- Payment notes, attachments, deallocation, arrears tracking for unverify

alter table payments add column if not exists payment_note text;

create table payment_attachments (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  file_url text not null,
  file_name text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index payment_attachments_payment_idx on payment_attachments (payment_id);

alter table payment_attachments enable row level security;

create policy payment_attachments_select on payment_attachments for select using (
  exists (
    select 1 from payments p
    where p.id = payment_attachments.payment_id
      and (
        p.tenant_id = auth.uid()
        or public.is_org_staff(p.organization_id)
        or exists (
          select 1 from units u
          join site_assignments sa on sa.site_id = u.site_id
          where u.id = p.unit_id and sa.user_id = auth.uid()
        )
      )
  )
);

create policy payment_attachments_insert on payment_attachments for insert with check (
  exists (
    select 1 from payments p
    where p.id = payment_attachments.payment_id
      and (
        (p.tenant_id = auth.uid() and public.tenant_has_active_lease(p.unit_id))
        or public.is_org_staff(p.organization_id)
        or exists (
          select 1 from units u
          join site_assignments sa on sa.site_id = u.site_id
          where u.id = p.unit_id and sa.user_id = auth.uid()
        )
      )
  )
);

-- Track arrears bucket applied per payment for reversal
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
  v_arrears_applied numeric(14, 2) := 0;
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

  select arrears_balance_ngn into v_arrears
  from units where id = v_payment.unit_id for update;

  if v_arrears > 0 and v_remaining > 0 then
    v_apply := least(v_remaining, v_arrears);
    update units
    set arrears_balance_ngn = arrears_balance_ngn - v_apply,
        updated_at = now()
    where id = v_payment.unit_id;
    v_arrears_applied := v_apply;
    v_remaining := v_remaining - v_apply;
  end if;

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

  update payments
  set metadata = coalesce(metadata, '{}'::jsonb)
    || jsonb_build_object(
      'arrears_applied_ngn', v_arrears_applied,
      'unallocated_credit_ngn', greatest(v_remaining, 0)
    )
  where id = p_payment_id;
end;
$$;

create or replace function public.deallocate_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments%rowtype;
  v_alloc record;
  v_arrears_applied numeric(14, 2);
begin
  select * into v_payment from payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;

  if v_payment.status not in ('verified', 'auto_matched') then
    raise exception 'Only verified payments can be unverified';
  end if;

  v_arrears_applied := coalesce((v_payment.metadata->>'arrears_applied_ngn')::numeric, 0);

  if v_arrears_applied > 0 then
    update units
    set arrears_balance_ngn = arrears_balance_ngn + v_arrears_applied,
        updated_at = now()
    where id = v_payment.unit_id;
  end if;

  for v_alloc in
    select * from payment_allocations where payment_id = p_payment_id
  loop
    update ledger_periods
    set paid_total_ngn = paid_total_ngn - v_alloc.amount_ngn,
        arrears_closing_ngn = greatest(
          expected_total_ngn + arrears_opening_ngn - paid_total_ngn + v_alloc.amount_ngn,
          0
        )
    where id = v_alloc.ledger_period_id;
  end loop;

  delete from payment_allocations where payment_id = p_payment_id;

  update payments
  set metadata = coalesce(metadata, '{}'::jsonb)
    - 'arrears_applied_ngn'
    - 'unallocated_credit_ngn'
  where id = p_payment_id;
end;
$$;
