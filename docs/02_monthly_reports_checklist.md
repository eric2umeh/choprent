# ChopRent — monthly reports archive

Export and store these **every month** in your `reports/YYYY-MM/` folder.

---

## A. Product usage

| Indicator | Example | Archive file |
|-----------|---------|---------------|
| Units registered | 80 | `units_export.csv` |
| Tenants with profiles | 75 | screenshot |
| Tenants self-serving (uploaded proof) | 8 → 25 → 40 | dashboard screenshot (dated) |
| Admin-verified payments this month | 42 | `payments_export.csv` |
| Total ₦ collected (verified) | ₦4,200,000 | report PDF |
| Collection rate vs expected rent | 78% | chart screenshot |
| Arrears outstanding | ₦X | report |

---

## B. Commercial (landlord → you)

| Indicator | Archive |
|-----------|----------|
| Monthly platform/management fee received | Bank alert / invoice |
| Contract or LOI signed | PDF in `signed/` |
| Line items (management vs software) | Invoice |

---

## C. Third-party validation

| Item | When |
|------|------|
| Landlord reference letter | After 90-day pilot |
| Landlord signed LOI | Before/at launch |
| Optional: 1 tenant testimonial (short) | Month 2+ |

---

## D. Technical (your contribution)

| Item | Max 3 pages each |
|------|------------------|
| Architecture diagram (your authorship) | `docs/01_architecture.md` export |
| GitHub commit summary / repo link | export |
| Screenshots: admin dashboard, tenant mobile, receipt upload flow | 1 doc |

---

## E. Bank receipt workflow (audit trail)

For each verified payment, system should store:

```
tenant_id, unit_id, amount_ngn, period (e.g. May 2026),
payment_date, bank_reference, receipt_file_url,
verified_by, verified_at
```

**Monthly reconciliation:** system total vs landlord bank statement (redact account number in monthly archive).

---

## F. Targets for go/no-go (suggested ask)

After **3 months live**, propose:

- **80** units on system  
- **₦[X]M+** verified collections recorded  
- **10+** tenants using self-service OR 100% admin-recorded with receipt images  
- **2** reference letters (hotel billing product + plaza landlord)  
- **2** products with GitHub + architecture documentation  

Ask: *“Does this satisfy pilot success criteria for both products?”*
