-- ChopRent RLS policies — Sprint 0
-- Landlord (owner) only inserts plaza/units; manager updates existing; agents site-scoped

alter table organizations enable row level security;
alter table memberships enable row level security;
alter table sites enable row level security;
alter table site_assignments enable row level security;
alter table site_settlement_accounts enable row level security;
alter table units enable row level security;
alter table unit_type_history enable row level security;
alter table unit_components enable row level security;
alter table leases enable row level security;
alter table charge_templates enable row level security;
alter table ledger_periods enable row level security;
alter table ledger_lines enable row level security;
alter table payments enable row level security;
alter table payment_allocations enable row level security;
alter table management_documents enable row level security;
alter table virtual_accounts enable row level security;
alter table meters enable row level security;
alter table utility_transactions enable row level security;
alter table user_consents enable row level security;
alter table notifications enable row level security;
alter table metrics_snapshots enable row level security;

-- Organizations
create policy org_select on organizations for select using (
  public.is_org_staff(id)
  or exists (
    select 1 from memberships m where m.organization_id = organizations.id and m.user_id = auth.uid()
  )
);

create policy org_update on organizations for update using (
  public.is_org_owner(id)
);

-- Memberships
create policy memberships_select on memberships for select using (
  user_id = auth.uid()
  or public.is_org_staff(organization_id)
);

create policy memberships_manage on memberships for all using (
  public.is_org_owner(organization_id)
);

-- Sites — insert owner only
create policy sites_select on sites for select using (
  public.is_org_staff(organization_id)
  or exists (
    select 1 from site_assignments sa
    where sa.site_id = sites.id and sa.user_id = auth.uid()
  )
);

create policy sites_insert on sites for insert with check (
  public.is_org_owner(organization_id)
);

create policy sites_update on sites for update using (
  public.is_org_owner(organization_id)
);

create policy sites_delete on sites for delete using (
  public.is_org_owner(organization_id)
);

-- Site assignments — owner manages
create policy site_assignments_select on site_assignments for select using (
  user_id = auth.uid()
  or exists (
    select 1 from sites s
    where s.id = site_assignments.site_id and public.is_org_owner(s.organization_id)
  )
);

create policy site_assignments_manage on site_assignments for all using (
  exists (
    select 1 from sites s
    where s.id = site_assignments.site_id and public.is_org_owner(s.organization_id)
  )
);

-- Settlement accounts
create policy settlement_select on site_settlement_accounts for select using (
  exists (
    select 1 from sites s
    where s.id = site_settlement_accounts.site_id
      and (
        public.is_org_staff(s.organization_id)
        or exists (
          select 1 from site_assignments sa
          where sa.site_id = s.id and sa.user_id = auth.uid()
        )
      )
  )
);

create policy settlement_manage on site_settlement_accounts for all using (
  exists (
    select 1 from sites s
    where s.id = site_settlement_accounts.site_id and public.is_org_owner(s.organization_id)
  )
);

-- Units — insert owner only; manager update
create policy units_select on units for select using (
  public.is_org_staff(organization_id)
  or exists (
    select 1 from site_assignments sa
    where sa.site_id = units.site_id and sa.user_id = auth.uid()
  )
  or public.tenant_has_active_lease(units.id)
);

create policy units_insert on units for insert with check (
  public.is_org_owner(organization_id)
);

create policy units_update on units for update using (
  public.is_org_owner(organization_id) or public.is_org_manager(organization_id)
);

create policy units_delete on units for delete using (
  public.is_org_owner(organization_id)
);

-- Unit type history
create policy unit_type_history_select on unit_type_history for select using (
  exists (
    select 1 from units u
    where u.id = unit_type_history.unit_id
      and (
        public.is_org_staff(u.organization_id)
        or exists (
          select 1 from site_assignments sa
          where sa.site_id = u.site_id and sa.user_id = auth.uid()
        )
      )
  )
);

create policy unit_type_history_insert on unit_type_history for insert with check (
  exists (
    select 1 from units u
    where u.id = unit_type_history.unit_id
      and (public.is_org_owner(u.organization_id) or public.is_org_manager(u.organization_id))
  )
);

-- Leases — manager+ owner manage; tenant read own
create policy leases_select on leases for select using (
  tenant_user_id = auth.uid()
  or exists (
    select 1 from units u
    where u.id = leases.unit_id
      and (
        public.is_org_staff(u.organization_id)
        or exists (
          select 1 from site_assignments sa
          where sa.site_id = u.site_id and sa.user_id = auth.uid()
        )
      )
  )
);

create policy leases_manage on leases for all using (
  exists (
    select 1 from units u
    where u.id = leases.unit_id
      and (public.is_org_owner(u.organization_id) or public.is_org_manager(u.organization_id))
  )
);

-- Charge templates
create policy charge_templates_select on charge_templates for select using (
  public.is_org_staff(organization_id)
);

create policy charge_templates_manage on charge_templates for all using (
  public.is_org_owner(organization_id) or public.is_org_manager(organization_id)
);

-- Ledger
create policy ledger_periods_select on ledger_periods for select using (
  public.tenant_has_active_lease(unit_id)
  or exists (
    select 1 from units u
    where u.id = ledger_periods.unit_id
      and (
        public.is_org_staff(u.organization_id)
        or exists (
          select 1 from site_assignments sa
          where sa.site_id = u.site_id and sa.user_id = auth.uid()
        )
      )
  )
);

create policy ledger_periods_manage on ledger_periods for all using (
  exists (
    select 1 from units u
    where u.id = ledger_periods.unit_id
      and (public.is_org_owner(u.organization_id) or public.is_org_manager(u.organization_id))
  )
);

create policy ledger_lines_select on ledger_lines for select using (
  exists (
    select 1 from ledger_periods lp
    join units u on u.id = lp.unit_id
    where lp.id = ledger_lines.ledger_period_id
      and (
        public.tenant_has_active_lease(u.id)
        or public.is_org_staff(u.organization_id)
        or exists (
          select 1 from site_assignments sa
          where sa.site_id = u.site_id and sa.user_id = auth.uid()
        )
      )
  )
);

create policy ledger_lines_manage on ledger_lines for all using (
  exists (
    select 1 from ledger_periods lp
    join units u on u.id = lp.unit_id
    where lp.id = ledger_lines.ledger_period_id
      and (public.is_org_owner(u.organization_id) or public.is_org_manager(u.organization_id))
  )
);

-- Payments
create policy payments_select on payments for select using (
  tenant_id = auth.uid()
  or public.is_org_staff(organization_id)
  or exists (
    select 1 from units u
    join site_assignments sa on sa.site_id = u.site_id
    where u.id = payments.unit_id and sa.user_id = auth.uid()
  )
);

create policy payments_insert on payments for insert with check (
  (tenant_id = auth.uid() and public.tenant_has_active_lease(unit_id))
  or public.is_org_staff(organization_id)
  or exists (
    select 1 from units u
    join site_assignments sa on sa.site_id = u.site_id
    where u.id = payments.unit_id and sa.user_id = auth.uid()
  )
);

create policy payments_update on payments for update using (
  public.is_org_staff(organization_id)
  or exists (
    select 1 from units u
    join site_assignments sa on sa.site_id = u.site_id
    where u.id = payments.unit_id and sa.user_id = auth.uid()
  )
);

-- Payment allocations
create policy payment_allocations_select on payment_allocations for select using (
  exists (
    select 1 from payments p
    where p.id = payment_allocations.payment_id
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

create policy payment_allocations_manage on payment_allocations for all using (
  exists (
    select 1 from payments p
    where p.id = payment_allocations.payment_id
      and (
        public.is_org_owner(p.organization_id)
        or public.is_org_manager(p.organization_id)
        or exists (
          select 1 from units u
          join site_assignments sa on sa.site_id = u.site_id
          where u.id = p.unit_id and sa.user_id = auth.uid()
        )
      )
  )
);

-- Documents
create policy documents_select on management_documents for select using (
  public.is_org_staff(organization_id)
  or exists (
    select 1 from leases l
    where l.id = management_documents.lease_id and l.tenant_user_id = auth.uid()
  )
  or (
    unit_id is not null and public.tenant_has_active_lease(unit_id)
  )
);

create policy documents_manage on management_documents for all using (
  public.is_org_owner(organization_id) or public.is_org_manager(organization_id)
);

-- Virtual accounts — owner provisions
create policy virtual_accounts_select on virtual_accounts for select using (
  exists (
    select 1 from units u
    where u.id = virtual_accounts.unit_id
      and (
        public.is_org_staff(u.organization_id)
        or public.tenant_has_active_lease(u.id)
        or exists (
          select 1 from site_assignments sa
          where sa.site_id = u.site_id and sa.user_id = auth.uid()
        )
      )
  )
);

create policy virtual_accounts_manage on virtual_accounts for all using (
  exists (
    select 1 from units u
    where u.id = virtual_accounts.unit_id and public.is_org_owner(u.organization_id)
  )
);

-- Notifications
create policy notifications_select on notifications for select using (
  user_id = auth.uid()
);

create policy notifications_update on notifications for update using (
  user_id = auth.uid()
);

-- User consents
create policy user_consents_self on user_consents for all using (
  user_id = auth.uid()
);

-- Metrics — owner/manager read
create policy metrics_select on metrics_snapshots for select using (
  public.is_org_staff(organization_id)
);

create policy metrics_manage on metrics_snapshots for all using (
  public.is_org_owner(organization_id)
);
