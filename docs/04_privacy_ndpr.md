# ChopRent — Privacy & NDPR (Nigeria Data Protection Regulation)

Practical compliance suggestions for a rent-collection platform handling tenant PII, bank references, and receipt images. **Not legal advice** — have a Nigerian privacy lawyer review before launch.

---

## 1. Data you will process

| Category | Examples | Sensitivity |
|----------|----------|-------------|
| Identity | Name, phone, email, business name | Personal data |
| Tenancy | Lease dates, unit, rent amounts | Personal + financial |
| Payments | Bank refs, amounts, receipt images | Financial |
| Virtual accounts | Dedicated NUBAN linked to unit | Financial |
| Utilities (Phase 2) | Meter number, token history | Personal + financial |
| Staff | Manager/agent actions, verify audit | Employment-related |

---

## 2. Lawful basis (NDPR Art. 6)

For each processing activity, document basis in your privacy policy:

| Activity | Suggested basis |
|----------|-----------------|
| Account creation (manager assigns tenant) | **Contract** — tenancy / platform use |
| Rent ledger & verification | **Contract** + **Legal obligation** (audit trail) |
| Marketing to landlords (B2B) | **Consent** or **Legitimate interest** |
| Analytics / product usage | **Legitimate interest** (aggregated, minimal PII) |
| AI receipt OCR | **Consent** at first upload + contract |

**Tenant assigned by manager:** On first login, show **Terms + Privacy Policy + consent** for processing payment data and storing receipts indefinitely.

---

## 3. Required documents (launch checklist)

- [ ] **Privacy Policy** — what you collect, why, retention (forever for receipts — state clearly), who you share with (Supabase, Vercel, Paystack, email provider)
- [ ] **Terms of Service** — landlord vs tenant responsibilities, verification SLA disclaimer
- [ ] **Data Processing Agreement (DPA)** — between ChopRent (processor/controller TBD) and **landlord** when you process tenant data on their behalf
- [ ] **Cookie / local storage notice** — minimal for auth session
- [ ] **Consent log** — `user_consents(user_id, policy_version, accepted_at, ip)`

**Controller vs processor:** Typically the **landlord** is controller for tenant rent data; ChopRent is **processor** unless you sell direct to tenants — clarify in LOI and privacy policy.

---

## 4. NDPR principles applied

### Purpose limitation
Collect only: identity, lease, charges, payments, documents needed for rent management — not unrelated KYC unless landlord requires it (store separately).

### Data minimization
- Receipt photos: acceptable for verification; do not require full bank statement pages.
- Virtual account: store NUBAN + provider ref, not tenant full bank details.

### Storage limitation (your choice: forever)
NDPR expects retention limits. If retaining **forever**, document **legal/contractual justification**:
- Landlord audit and dispute resolution
- Tenant download of historical statements/letters
- Implement **access controls** rather than deletion as primary control

Offer **tenant data export** on request; define process for **anonymization** when lease ends + statutory period (e.g. 6 years tax dispute window — confirm with counsel).

### Security
- Supabase RLS + encrypted at rest (provider default)
- Signed URLs for receipts (short TTL)
- No service role key in client
- 2FA for landlord/manager accounts (recommended)
- Audit log on payment verify/reject

### Cross-border transfer
Supabase/Vercel may process outside Nigeria. Disclose in privacy policy; use providers with **SCCs / adequate safeguards**; NDPR requires notification to NITDA for certain transfers — legal review required.

---

## 5. Tenant rights (operational)

| Right | ChopRent feature |
|-------|------------------|
| Access | Tenant portal: ledger, receipts, letters download |
| Rectification | Request via manager; manager edits profile |
| Erasure | **Limited** while lease active; after lease + retention policy, anonymize PII keep financial audit hash |
| Portability | Export PDF/CSV statement |
| Object / restrict | Email support flow; flag on account |

**Response SLA:** 30 days (NDPR standard) — track in support inbox.

---

## 6. Breach response

1. Contain (rotate keys, revoke sessions)
2. Assess scope (which org, which tenants)
3. Notify **NITDA** within 72 hours if high risk
4. Notify **landlord** immediately; landlord may notify tenants
5. Document in `security_incidents` internal log

---

## 7. Children

Commercial tenancies rarely involve minors; if residential flats with minors, avoid marketing to under-18 and do not knowingly collect child data without guardian consent.

---

## 8. Implementation in app

```
onboarding/
├── privacy-policy v1 (markdown, versioned)
├── terms-of-service v1
└── consent checkbox + timestamp stored

settings/
├── landlord: DPA download, sub-processor list
└── tenant: download my data, contact DPO email

footer/
└── Privacy · Terms · Contact DPO
```

**DPO:** For pilot scale, designated privacy contact email is enough; appoint formal DPO if scaling nationally.

---

## 9. Sub-processors to list in policy

| Vendor | Purpose |
|--------|---------|
| Supabase | Database, auth, storage, functions |
| Vercel | Hosting |
| Paystack | Dedicated virtual accounts, webhooks (Phase 1.5) |
| Resend (or similar) | Transactional email |
| WhatsApp Business (future) | Notifications |

---

## 10. Receipt & document retention (forever)

- Storage bucket per org; no lifecycle delete
- Optional **cold tier** after 24 months (cheaper storage, same access latency acceptable)
- Backup: Supabase PITR + periodic export to landlord upon contract term

---

## 11. Pre-launch review

Before first real tenant data:

1. Lawyer reviews Privacy Policy + Terms + LOI alignment
2. Landlord signs DPA or LOI data appendix
3. First tenant login shows consent screen
4. Internal record of processing activities (ROPA) — one-page spreadsheet is fine for pilot
