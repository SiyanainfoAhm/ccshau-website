# CCSHAU — Supabase Backup & Restore Guide

**Project:** VBDC (`fvveqziyusjgqejowkfp`)  
**Region:** `ap-south-1`  
**Org plan (confirmed):** **Pro**  
**Last verified:** 22 July 2026  

Official reference: [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)

---

## 1. What is covered automatically

| Data | Covered by Supabase daily backups? |
|------|-------------------------------------|
| Postgres tables (`ccshau_*`, auth schema, etc.) | Yes — automatic on Pro |
| Auth users / sessions metadata | Yes |
| Storage **metadata** (bucket/object rows) | Yes |
| Storage **files** (images, PDFs in buckets) | **No** — separate process required |

On **Pro**, Supabase runs **daily automatic database backups**. Retention visible in the Dashboard: **last 7 days**.

You do **not** configure a custom cron for Postgres daily backups on Pro.

---

## 2. Confirm plan & daily backups (Dashboard)

### Plan

1. Open [Supabase Dashboard](https://supabase.com/dashboard).
2. Organization → **Billing / Subscription**.
3. Confirm plan is **Pro** (or Team / Enterprise).

### Backups list

1. Project **VBDC** → **Database** → **Backups** → **Scheduled**.
2. Confirm recent daily backups appear.
3. Optional API check (requires [access token](https://supabase.com/dashboard/account/tokens)):

```bash
# From repo root
export SUPABASE_ACCESS_TOKEN="sbp_..."
export SUPABASE_PROJECT_REF="fvveqziyusjgqejowkfp"
node scripts/ops/verify-supabase-backups.mjs
```

---

## 3. Point-in-Time Recovery (PITR) — decision

| Choice | When to use |
|--------|-------------|
| **Keep daily backups only (default)** | Meets RFP weekly backup requirement; no extra cost |
| **Enable PITR** | Need restore to a specific minute (RPO ≈ 2 minutes) |

**CCSHAU decision:** keep **managed daily backups**. Do **not** enable PITR unless the university requires sub-day RPO.

If enabling later:

1. **Database** → **Backups** → **Point in Time**.
2. Requires at least **Small** compute add-on.
3. Choose retention (7 / 14 / 28 days). Pricing is add-on (~USD 100–400/month).
4. Note: enabling PITR **replaces** separate daily backups (PITR is finer-grained).

---

## 4. Storage file backups (all data)

Buckets used by the CMS:

- `ccshau-public`
- `ccshau-private`
- `ccshau-media`

### Inventory + optional download

```bash
# Requires SUPABASE_SERVICE_ROLE_KEY (or apps/web/.env.local loaded)
export NEXT_PUBLIC_SUPABASE_URL="https://fvveqziyusjgqejowkfp.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."
node scripts/ops/backup-storage.mjs
# Optional full file copy:
node scripts/ops/backup-storage.mjs --download
```

Outputs under `backups/storage/<date>/`:

- `inventory.json` — object list (bucket, path, size, updated)
- `files/` — only when `--download` is passed

**Do not commit** `backups/` to git (gitignored). Store off-site (S3, Azure Blob, university NAS).

### GitHub Actions (optional off-site)

Workflow: [`.github/workflows/daily-backup.yml`](../../.github/workflows/daily-backup.yml)

Required repository secrets:

| Secret | Purpose |
|--------|---------|
| `SUPABASE_ACCESS_TOKEN` | List/verify Dashboard backups via Management API |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage inventory |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `SUPABASE_DB_PASSWORD` | Optional logical dump via CLI |

Runs daily at **02:30 UTC** (≈ 08:00 IST).

---

## 5. Restore drill (staging / new project)

**Never practice restore on production without an approved maintenance window.**

### A. Restore in place (same project)

1. **Database** → **Backups** → choose a backup before the incident.
2. Confirm restore (project is **offline** during restore; downtime scales with DB size — currently ~510 MB).
3. After restore:
   - Reset passwords for any **custom Postgres roles** (daily backups do not store those passwords).
   - Re-create subscriptions/replication slots if used (Realtime slot is handled automatically).
4. Re-upload Storage files deleted after the backup point (from off-site Storage backup).

### B. Restore to a new / duplicate project (preferred drill)

1. Create a **temporary** project (or use Dashboard duplicate / branch if available).
2. Restore or import dump into that project.
3. Point a staging `.env` at the temp project and smoke-test:
   - Admin login
   - Sample page / faculty / tender
   - One Storage image URL
4. Delete the temp project after the drill.
5. Record date, backup chosen, duration, and result in the AMC/ops log.

### C. Logical dump restore (CLI)

```bash
supabase login
supabase link --project-ref fvveqziyusjgqejowkfp
supabase db dump -f backups/db/ccshau-$(date +%Y%m%d).sql
# Restore into a *staging* database only:
# psql "$STAGING_DATABASE_URL" -f backups/db/ccshau-YYYYMMDD.sql
```

---

## 6. Operational checklist

- [ ] Org plan is Pro+ (confirmed)
- [ ] **Database → Backups** shows recent daily backups
- [ ] PITR left off unless sub-day RPO is required
- [ ] Storage inventory job runs (local or GitHub Action)
- [ ] Off-site copy of Storage inventory / files retained
- [ ] One restore drill documented before Go-Live
- [ ] Management API / service role tokens stored only in secrets managers

---

## 7. Contacts

| Role | Responsibility |
|------|----------------|
| DevOps / Computer Section | Dashboard backup verification, restore windows |
| Application team | Storage sync scripts, staging smoke tests |
| Super Admin | Approve production restore |
