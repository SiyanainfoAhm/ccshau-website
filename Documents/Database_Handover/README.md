# CCSHAU Database Handover Pack

**Purpose:** Shareable database scripts so the client can review and create the full CMS schema in their own Supabase environment.

**Generated from:** `supabase/migrations/*.sql` (**46** migrations, chronological)  
**Last rebuild:** 2026-07-29  
**Rebuild anytime:** `node scripts/ops/build-client-database-script.mjs`

---

## Files in this folder

| File | What it contains | When to use |
|------|------------------|-------------|
| **[01_ccshau_full_database.sql](./01_ccshau_full_database.sql)** | **All** migrations (schema + baseline + demo/college content + security locks) | Single-file “create everything” for a new env |
| [01a_ccshau_schema_and_baseline.sql](./01a_ccshau_schema_and_baseline.sql) | Schema, functions, RLS, indexes, baseline rows, security locks | Cleaner prod start without heavy demo pages |
| [02_ccshau_demo_seed_data.sql](./02_ccshau_demo_seed_data.sql) | Demo menus, colleges, PG Studies, galleries, etc. | Optional sample content after schema |
| [03_verify_schema.sql](./03_verify_schema.sql) | Counts tables / functions / policies + Phase A security checks | After apply — confirm objects + locks |
| [04_bootstrap_super_admin.sql](./04_bootstrap_super_admin.sql) | Template to attach first Super Admin | After Auth user is created |
| [SCHEMA_INVENTORY.md](./SCHEMA_INVENTORY.md) | Object checklist (tables, functions, …) | Client review / sign-off |

**Recommended for client review + create:** start with **`01_ccshau_full_database.sql`**.

---

## Prerequisites

1. **Supabase Cloud project** (Auth + Storage). This script is **not** for bare PostgreSQL without Supabase Auth (`auth.users` FKs).
2. SQL Editor access (or `psql` with the project database URL).
3. Optional extensions used by some migrations:
   - `vault` — Google Translate secret helper (`ccshau_get_vault_secret`)
   - `pg_cron` — tender expiry scheduling (may require Pro / extensions enabled)

---

## How to apply (client steps)

### Option A — Dashboard (simplest)

1. Open Supabase Dashboard → project → **SQL Editor**.
2. Open `01_ccshau_full_database.sql`.
3. Paste and **Run**.  
   - If the editor rejects a very large paste, run in order:  
     `01a_ccshau_schema_and_baseline.sql` → then `02_ccshau_demo_seed_data.sql`.
4. Run `03_verify_schema.sql` and confirm counts look healthy **and** Phase A security checks pass.
5. Create the first Auth user (Authentication → Users).
6. Fill placeholders in `04_bootstrap_super_admin.sql` and run it.

### Option B — `psql`

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f Documents/Database_Handover/01_ccshau_full_database.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f Documents/Database_Handover/03_verify_schema.sql
```

### Option C — Prefer migrations (developers)

```bash
npx supabase link --project-ref <CLIENT_PROJECT_REF>
npx supabase db push
```

This applies the same SQL as individual migration files under `supabase/migrations/`.

---

## What is included

- All `ccshau_*` **tables**
- **Enums / types**
- **Functions** (updated_at, audit, archive jobs, download count, vault secret, search vectors, …)
- **Triggers**
- **Indexes**
- **RLS policies**
- **Storage bucket** inserts + storage read policies
- Baseline departments / menus / site_settings where migrations insert them
- Demo/college content when using the **full** script
- **Phase A security locks** (`20260723140000_security_phase_a_locks.sql`):
  - RLS enabled on `ccshau_download_versions`; DML revoked from `anon` / `authenticated`
  - Sensitive RPCs (`ccshau_get_vault_secret`, `ccshau_write_audit_log`, archive helpers, `ccshau_generate_ticket_number`) executable by `service_role` only

See [SCHEMA_INVENTORY.md](./SCHEMA_INVENTORY.md) for the full object list.

---

## Naming convention

All application objects use the `ccshau_` prefix.  
Details: [docs/database-naming-convention.md](../database-naming-convention.md)

---

## After schema — application checklist

- [ ] Env vars: `NEXT_PUBLIC_SUPABASE_URL`, anon key, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Storage buckets exist: `ccshau-public`, `ccshau-private`, `ccshau-media`
- [ ] Super Admin can log into `/admin/login`
- [ ] Optional: Captcha / Power Automate settings in Admin → Settings
- [ ] Optional: Vault secret for Google Translate API
- [ ] Run `03_verify_schema.sql` — confirm `ccshau_download_versions.rls_on = true` and sensitive RPCs `can_exec = false` for `anon`

---

## Notes / limitations

- Re-running the full script on a DB that already has objects may error on `CREATE` without `IF NOT EXISTS` in older migrations. Prefer a **fresh** Supabase project, or use `supabase db push` on an empty linked project.
- Managed backups / PITR are platform settings — not part of this SQL pack.
- Auth users are **not** created by this script (use Supabase Auth UI or Admin API).
- App-layer security (CAPTCHA toggle, rate limits, IDOR checks, HTML sanitizer, security headers) lives in the Next.js app — not in this SQL pack.
