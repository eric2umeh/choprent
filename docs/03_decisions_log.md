# ChopRent — Decisions log

Locked product decisions from pre-build Q&A. Architecture doc implements these; update this table when scope changes.

| # | Area | Decision | Date |
|---|------|----------|------|
| 1 | Pilot model | **Single landlord** first; schema supports multi-landlord/multi-plaza for year 1 growth | 2026-06-08 |
| 2 | Tenant onboarding | **Manager assigns** phone and/or email; tenant completes auth | 2026-06-08 |
| 3 | Tenancy | **Full lease** with start/end dates + **renewal** (new lease record linked to prior) | 2026-06-08 |
| 4 | Hierarchy | **Plaza → Unit** (no required block layer); plaza name entered by landlord | 2026-06-08 |
| 5 | Unit numbering | Composite codes supported: `14/16`, `14 & 16` (merged or dual-number units) | 2026-06-08 |
| 6 | Property types | `shop`, `flat`, `office`, `warehouse`, `kiosk`, `parking`, `restaurant`, `other` | 2026-06-08 |
| 7 | Type changes | **Shop → office** (and similar) allowed; history preserved in `unit_type_history` | 2026-06-08 |
| 8 | Billing cadence | **Monthly, quarterly, annual** selectable per lease/charge; **annual most common** | 2026-06-08 |
| 9 | Charge lines | Base rent + service (%) + agency (fixed) + **VAT, diesel, security**, other | 2026-06-08 |
| 10 | Charge overrides | Per-unit overrides on top of property-type templates | 2026-06-08 |
| 11 | Arrears | **Carry forward automatically** year to year until cleared | 2026-06-08 |
| 12 | Partial payments | **Allowed** — allocate to oldest arrears first, then current period | 2026-06-08 |
| 13 | Payment methods (Phase 1) | **Bank transfer** + **cash recorded by manager** | 2026-06-08 |
| 14 | Gateway fees | **TBD / configurable** per org when gateway enabled (`fee_bearer` open) | 2026-06-08 |
| 15 | Settlement accounts | **Multiple bank accounts per plaza** (rent may settle to different accounts) | 2026-06-08 |
| 16 | Receipt verification | **Landlord, manager, or assigned agent** can verify | 2026-06-08 |
| 17 | Agent site scope | **Assigned sites only** (default; revisit if ops need broader access) | 2026-06-08 |
| 18 | Unit CRUD | **Landlord only** can add plaza/units — managers and agents cannot | 2026-06-08 |
| 19 | Landlord powers | Landlord has **full org access** (same as owner role) | 2026-06-08 |
| 20 | Tenant auth | **Email and phone** (both supported) | 2026-06-08 |
| 21 | Notifications | **Email + in-app** now; **WhatsApp** later | 2026-06-08 |
| 22 | AI budget | **Zero / very low cost** — client OCR, rules, templates first | 2026-06-08 |
| 23 | AI priorities | (1) Receipt OCR pre-fill (2) Arrears reminders (3) Rent FAQ chatbot | 2026-06-08 |
| 24 | Pilot size | Reporting target = **this plaza** (not multi-site aggregate) | 2026-06-08 |
| 25 | Self-serving tenant | Upload receipt, **view ledger**, **management letters**, download **statements + letters** | 2026-06-08 |
| 26 | Commercial model | See **`docs/01_LOI_pilot_agreement_draft.md`** (landlord-provided) | 2026-06-08 |
| 27 | Year 1 ambition | **More plazas, more landlords** on same platform | 2026-06-08 |
| 28 | Receipt retention | **Forever** — no auto-delete; plan storage tiering only | 2026-06-08 |
| 29 | NDPR | See **`docs/04_privacy_ndpr.md`** | 2026-06-08 |
| 30 | Product name | **ChopRent** in UI | 2026-06-08 |
| 31 | Paystack DVA | **Phase 1.5** — dedicated virtual account **per unit**; account number persists, display name updates on tenant change | 2026-06-08 |
| 32 | Trader UX | Traders pay via **static account number** without app login; app optional for receipts/statements | 2026-06-08 |
| 33 | Electricity | **Phase 2** — prepaid meter / token flow; disco partnership + optional platform margin (TBD legally) | 2026-06-08 |
| 34 | vs PayRent | Lead with DVA + verified transfer + plaza charge engine; skip credit reporting/lending/screening | 2026-06-08 |
| 35 | Supabase schema | Apply via **`supabase db push`** — not manual SQL editor (see `07_supabase_setup.md`) | 2026-06-08 |
| 36 | UI list views | **Table default**, card optional toggle; filters + pagination; mobile expand rows (no horizontal scroll) | 2026-06-11 |
| 37 | Marketplace search/book for tenants | **Defer** — keep Lyteville for discovery; ChopRent for plaza ops + verified rent (see `06_competitive_positioning.md`) | 2026-06-11 |
