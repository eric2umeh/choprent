-- Optional rent-collection account per unit (property still has many accounts).
-- Portal resolve order: lease.settlement_account_id → units.settlement_account_id → site default.

alter table units
  add column if not exists settlement_account_id uuid
    references site_settlement_accounts (id) on delete set null;

create index if not exists units_settlement_account_id_idx
  on units (settlement_account_id)
  where settlement_account_id is not null;
