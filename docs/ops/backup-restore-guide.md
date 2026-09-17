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

## 5. Pre-import backup (before legacy data load)

Take a local snapshot **immediately before** importing legacy MySQL content:

```bash
# From repo root — read-only; does not modify the live database
npm run backup:pre-import

# Optional: also download Storage files (large)
node scripts/ops/backup-pre-import.mjs --with-storage-files
```

Output: `backups/pre-import/<timestamp>/` (gitignored)

| Artifact | Purpose |
|----------|---------|
| `tables/*.json` | Row-level snapshot of `ccshau_*` tables (via service role) |
| `database-dump.sql` | Full logical dump **if** `SUPABASE_DB_PASSWORD` or `DATABASE_URL` is set |
| `MANIFEST.json` / `README.md` | Rollback notes |
| `backups/storage/...` | Storage inventory from `backup-storage.mjs` |

**Rollback options after a bad import:**

1. Supabase Dashboard → **Database → Backups** → restore the daily backup from *before* import (downtime; needs approval).
2. Use the JSON / SQL snapshot above on a **staging** project first; only restore production with Super Admin approval.

---

## 6. Restore drill (staging / new project)

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

### C. Full logical backup and restore scripts (Windows)

Use these scripts when the application database must be portable to another
Supabase project or its data must be rolled back in the current project:

- `scripts/ops/backup-full-database.ps1`
- `scripts/ops/restore-full-database.ps1`
- `scripts/ops/verify-full-database.ps1`

The backup follows Supabase's supported split format:

| Artifact | Contents |
|----------|----------|
| `roles.sql` | Postgres roles and grants |
| `schema.sql` | Tables, views, functions/procedures, triggers, indexes, constraints, enums and RLS |
| `data.sql` | Application/Auth rows; all `storage.*` table data is excluded |
| `history_schema.sql` / `history_data.sql` | Supabase CLI migration history |
| `manifest.json` | Source, tools, object inventory, row counts, sizes and SHA-256 checksums |

#### Prerequisites

1. Node.js 20+ and repository dependencies (`npm install`).
2. Docker Desktop or Podman running for Supabase CLI database dumps.
3. The pinned Supabase CLI (`npx supabase --version`).
4. PostgreSQL 15+ command-line tools for restore (`psql --version`).
   On Windows, install PostgreSQL and add, for example,
   `C:\Program Files\PostgreSQL\17\bin` to `PATH`.
5. A percent-encoded direct or Session Pooler database connection string from
   Supabase Dashboard → **Connect**. Never commit connection strings.

#### Create a backup

```powershell
cd C:\Jatin\Projects\CCSHAU_Project

$env:SOURCE_DATABASE_URL = "postgresql://postgres.PROJECT_REF:PERCENT_ENCODED_PASSWORD@POOLER_HOST:5432/postgres"
$env:SUPABASE_PROJECT_REF = "PROJECT_REF"

npm run backup:database
```

Output is written to:

```text
backups/database/PROJECT_REF-YYYYMMDDTHHMMSSZ/
```

Validate files and checksums without connecting to a database:

```powershell
$backup = (Get-Content .\backups\database\LATEST.txt -Raw).Trim()
npm run verify:database-backup -- -BackupDirectory $backup
```

Treat every backup directory as a production secret. It may contain personal
data, Auth users and password hashes. Vault data is excluded by the Supabase
CLI. Database URLs are passed to the CLI as process arguments, so run the
scripts only on a trusted administrator machine.

#### Restore to a new Supabase project

Create an empty Supabase project first and enable the extensions used by the
source project. Then run:

```powershell
$backup = (Get-Content .\backups\database\LATEST.txt -Raw).Trim()
$env:TARGET_DATABASE_URL = "postgresql://postgres.NEW_PROJECT_REF:PERCENT_ENCODED_PASSWORD@POOLER_HOST:5432/postgres"

npm run restore:database -- `
  -BackupDirectory $backup `
  -TargetProjectRef "NEW_PROJECT_REF" `
  -Mode NewProject `
  -Confirmation "RESTORE:NEW_PROJECT_REF"
```

The restore runs roles → schema → data → migration history in one transaction
with `ON_ERROR_STOP=1`. If any SQL statement fails, PostgreSQL rolls back the
transaction.

#### Restore data in the current project

Supabase does not support safely dropping and rebuilding all managed schemas
in-place with a generic SQL script. `ReplaceData` therefore verifies that the
existing schema contains the backup's expected objects, then replaces rows in
every table emitted by `data.sql`. It does not drop or replace schema objects
or roles. It creates a target safety backup under `backups/pre-restore/`
before executing destructive SQL.

```powershell
$backup = "C:\secure-backups\PROJECT_REF-YYYYMMDDTHHMMSSZ"
$env:TARGET_DATABASE_URL = "postgresql://postgres.PROJECT_REF:PERCENT_ENCODED_PASSWORD@POOLER_HOST:5432/postgres"

npm run restore:database -- `
  -BackupDirectory $backup `
  -TargetProjectRef "PROJECT_REF" `
  -Mode ReplaceData `
  -Confirmation "REPLACE-DATA:PROJECT_REF"
```

Do not use `-SkipSafetyBackup` in production. First test the same backup with
`NewProject` mode and complete the restore drill checklist. For a complete
same-project schema rollback, use Supabase Dashboard managed Backups/PITR
rather than deleting the platform's `auth` or `storage` schemas.

#### Verify a restored database

Restore runs verification automatically. It can also be run separately:

```powershell
npm run verify:database-backup -- `
  -BackupDirectory $backup `
  -DatabaseUrl $env:TARGET_DATABASE_URL `
  -ProjectRef "PROJECT_REF"
```

Verification checks:

- Every artifact size and SHA-256 hash.
- Expected tables, views, functions/procedures, triggers, policies and indexes exist.
- Exact row counts for all `public.ccshau_*` application tables.

Auth/session table counts are not required to remain exact after users begin
signing in.

#### Important limitations

- **Storage is excluded.** Neither Storage object files nor `storage.*`
  metadata rows are included. Use `backup-storage.mjs --download` for files
  and recreate bucket configuration separately.
- Auth users and password hashes can be migrated, but users must sign in again
  when the destination project has a different JWT secret.
- Vault/pgsodium data and managed schema definitions (`auth`, `storage`,
  `vault`, extension schemas, etc.) are excluded from `schema.sql`. A new
  Supabase project supplies the platform schemas; configure Vault secrets
  again. Custom changes made directly inside managed schemas require a
  separate reviewed schema diff.
- Custom login roles require passwords to be reset after migration.
- Edge Functions, project API settings, Auth provider settings, SMTP, Realtime
  publication settings and secrets are platform configuration, not database
  rows; configure them separately.
- A newly provisioned project is the required first restore target. Never use
  production as the first test.

---

## 7. Operational checklist

- [ ] Org plan is Pro+ (confirmed)
- [ ] **Database → Backups** shows recent daily backups
- [ ] PITR left off unless sub-day RPO is required
- [ ] Storage inventory job runs (local or GitHub Action)
- [ ] Off-site copy of Storage inventory / files retained
- [ ] Run `npm run backup:pre-import` immediately before legacy import
- [ ] One restore drill documented before Go-Live
- [ ] Management API / service role tokens stored only in secrets managers

---

## 8. Contacts

| Role | Responsibility |
|------|----------------|
| DevOps / Computer Section | Dashboard backup verification, restore windows |
| Application team | Storage sync scripts, staging smoke tests |
| Super Admin | Approve production restore |
