# Phase 2 — Technical Architecture & Database Design

**Deliverable:** D3 — Technical architecture document approved  
**Duration:** ~1 week  
**Status:** ✅ Done (technical) — formal IT approval pending  
**Completed:** 23 June 2026

## Documents

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | System design — Next.js + Supabase + Vercel + Power Automate |
| [database-schema.md](./database-schema.md) | Entity relationships, table definitions, indexes |
| [api-spec.md](./api-spec.md) | Server Actions, Route Handlers, Edge Functions |
| [storage-policy.md](./storage-policy.md) | Supabase Storage buckets and access rules |
| [url-redirect-plan.md](./url-redirect-plan.md) | URL taxonomy and legacy `hau.ac.in` redirect map |

## Migrations

| File | Purpose |
|------|---------|
| `supabase/migrations/20260623100000_phase_0_init.sql` | Schema meta, `set_updated_at` |
| `supabase/migrations/20260623110000_ccshau_naming_convention.sql` | Naming convention helpers |
| `supabase/migrations/20260623120000_phase_2_schema.sql` | Enums, tables, indexes |
| `supabase/migrations/20260623130000_phase_2_rls_functions.sql` | RLS policies, audit/search functions, seed departments |
| `supabase/migrations/20260624120000_storage_buckets.sql` | Storage buckets (`ccshau-public`, `ccshau-private`, `ccshau-media`) |

Applied to Supabase Cloud project `fvveqziyusjgqejowkfp`.

Apply locally:

```bash
supabase db reset          # local only
# or
supabase migration up      # apply pending migrations
```

## Exit criteria

- [x] Technical architecture document
- [x] Normalized PostgreSQL schema (migrations)
- [x] API specification
- [x] Storage bucket policy document
- [x] URL taxonomy and redirect plan
- [x] Migrations applied to Supabase Cloud (`fvveqziyusjgqejowkfp`)
- [ ] Architecture review / approval (Computer Section)

## Dependencies from CCSHAU IT

| Item | Needed for |
|------|------------|
| Power Automate flow URLs | Phase 3 — email (feedback, lockout, password reset) |
| Legacy URL export from hau.ac.in | Phase 5 — populate `ccshau_url_redirects` |
| Department list confirmation | RBAC assignment in Phase 3 |

## Next phase

**Phase 3 — Admin Dashboard & CMS** — see [phase-3 README](../phase-3/README.md).  
**Phase 4 — Public Website** — see [phase-4 README](../phase-4/README.md).
