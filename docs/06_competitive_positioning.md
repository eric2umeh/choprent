# ChopRent — Competitive positioning & unique value

**Reference reviewed:** [PayRent product features](https://www.payrent.com/rent-payment-app-features/#h-product) (US independent-landlord rent app, March 2026).

**Purpose:** Avoid building a “generic rent app”. ChopRent must be clearly **plaza / Nigerian commercial-first**, with features PayRent and local clones do not combine.

---

## 1. What PayRent does (summary)

PayRent targets **US residential landlords** with:

| Category | Typical features |
|----------|------------------|
| Payments | ACH/eCheck, credit cards, block partial payments, fee pass-through |
| Revenue | Late fees, additional charges, ledger, prevent payment during eviction |
| Leasing | Tenant onboarding, screening marketplace, e-sign, renters insurance |
| Fintech extras | Credit bureau rent reporting, emergency rent loans (RentCred™), landlord capital |
| Ops | Reminders, activity feed, document store, QuickBooks export, clone property |
| Security | Encrypted vault, SSL, chargeback alerts |

**Gap for your pilot:** PayRent is not built for **Nigerian plaza traders**, **₦1M+ annual shop rent**, **multiple settlement accounts per site**, **manager/agent verification chains**, or **monthly verified-collection report packs**.

---

## 2. What we deliberately do NOT copy (low uniqueness)

These are **commodity** in rent apps globally — implement only if pilot landlord asks; do not lead product narrative:

- US credit bureau reporting (Experian/TransUnion/Equifax)
- In-app tenant screening marketplace
- Landlord lending / “Capital” products
- Emergency interest-free tenant loans
- Credit-card-first checkout
- Renters insurance tracking
- “Block partial payments” (opposite of your pilot need)

---

## 3. ChopRent unique differentiators

These should appear in architecture docs, demo script, and landlord pitch.

### A. Trader-zero-friction collection ( flagship )

**Persistent dedicated NUBAN per shop unit** via Paystack DVA:

- Account number **stays on the shop door** when tenant changes; only display name updates
- Payment works **without app login** — critical for market traders
- Webhook → auto-match → optional verify → ledger + reporting

*PayRent:* one landlord settlement account; tenants pay through app/ACH. No per-unit sticky NUBAN for turnover.

### B. Plaza-native unit model

- **Composite unit codes** (`14/16`, `14 & 16`) as first-class billing entities
- **Property type conversion** with audit history (shop → office)
- Mixed **shop / flat / restaurant / kiosk** in one plaza hierarchy
- **Multiple settlement bank accounts per plaza** (rent vs service charge routing)

*PayRent:* “clone property” for similar units; no composite numbering or NG plaza semantics.

### C. Verified payment audit pipeline (product + compliance)

Every verified payment stores audit fields required for monthly reports:

`tenant_id, unit_id, amount_ngn, period, payment_date, bank_reference, receipt_file_url, verified_by, verified_at`

Plus one-click **CSV export** (`02_monthly_reports_checklist.md`) — the product is instrumented for reporting, not just collection.

*PayRent:* landlord reconciliation; not designed for third-party monthly report archives.

### D. Flexible plaza charge engine

- **Annual-first** billing (typical NG shop lease) with monthly/quarterly option
- **Stacked charges:** base rent + service **%** + agency **fixed** + VAT, diesel, security
- **Partial payments allowed** with **oldest-arrears-first** allocation
- Arrears **carry year to year**

*PayRent:* additional fees yes; blocks partial payments; US-centric due-date model.

### E. Operations model for managed plazas

- **Landlord-only** unit creation (control)
- **Manager** runs leases/charges on existing units
- **Agent** verifies receipts on **assigned sites only**
- **Management letters** + tenant download of statements/letters (formal plaza ops)

*PayRent:* single landlord DIY; no agent site scope.

### F. Utilities path (Phase 2 — optional moat)

Prepaid **electricity meter / token** flow tied to unit, with disco or aggregator partnership — combines rent + utilities in one plaza ledger.

*PayRent:* no utility metering.

### G. Zero-cost receipt intelligence

On-device **Tesseract OCR** pre-fill on upload (no paid AI API) + rule-based arrears reminders + FAQ bot from docs.

*PayRent:* notifications and ledger; no receipt OCR for bank-transfer proof.

---

## 4. Features worth adopting from PayRent (non-unique but expected)

Build these in MVP/Phase 1 — table stakes, not differentiation:

| Feature | ChopRent phase | Notes |
|---------|----------------|-------|
| Tenant portal + ledger | Sprint 3–4 | Already scoped |
| Rent reminders | Sprint 7 | Email + in-app; WhatsApp Phase 2 |
| Activity feed | Sprint 5 | Realtime on payments/units |
| Document management | Sprint 4 | Letters, statements, receipts |
| Automated late fees | Sprint 2–3 | After charge engine |
| Dashboard (collected vs due) | Sprint 5 | Collection rate for reports |
| Transaction export CSV | Sprint 5 | Reports + landlord books |
| Search/filter units & payments | Sprint 5 | Plaza scale |

---

## 5. Patent & “uniqueness” framing (honest)

ChopRent is unlikely to patent “online rent collection.” Stronger **defensible narrative** for reviewers:

1. **System + method** for persistent per-commercial-unit virtual account with tenant rotation without NUBAN change (document in architecture + webhook flow).
2. **Composite commercial unit** billing and arrears allocation across merged shop numbers.
3. **Human-in-the-loop verified transfer pipeline** producing standardized monthly report artifacts for property-management pilots in NG.

Before filing anything: talk to a **IP lawyer**; treat this doc as product strategy, not legal advice.

**Demo one-liner:**

> “PayRent helps US landlords collect card/ACH rent. ChopRent gives each plaza shop a **permanent payment account**, verifies **bank transfers at million-naira scale**, and exports **audited collection reports** for mixed shop/office plazas in Nigeria.”

---

## 6. Roadmap priority (unique vs commodity)

```mermaid
quadrantChart
  title Feature priority
  x-axis Low uniqueness --> High uniqueness
  y-axis Low pilot need --> High pilot need
  quadrant-1 Build first (moat)
  quadrant-2 Build for pilot proof
  quadrant-3 Defer
  quadrant-4 Nice later
  DVA sticky NUBAN: [0.92, 0.88]
  Verified receipt audit: [0.85, 0.90]
  Plaza charge engine: [0.78, 0.85]
  Composite units: [0.80, 0.75]
  Report export pack: [0.88, 0.82]
  Tenant portal: [0.35, 0.80]
  Rent reminders: [0.25, 0.70]
  Credit reporting: [0.15, 0.10]
  Tenant screening: [0.20, 0.15]
  Card checkout: [0.30, 0.40]
  Electricity tokens: [0.75, 0.45]
```

---

## 7. Decision log cross-reference

| # | Item | Status |
|---|------|--------|
| 34 | Position vs PayRent | Documented here |
| 35 | Lead demo with DVA + verified transfer + plaza charge engine | Recommended |
| 36 | Defer credit reporting, lending, US screening | Confirmed skip |

Add rows to `03_decisions_log.md` when locked in review.
