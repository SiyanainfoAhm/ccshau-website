# Database Naming Convention — CCSHAU_

**Mandatory for all database objects in this project.**

| Rule | Pattern | Example |
|------|---------|---------|
| **Tables** | `CCSHAU_<entity>` | `CCSHAU_departments` |
| **Functions** | `CCSHAU_<action>_<entity>` | `CCSHAU_set_updated_at` |
| **Triggers** | `CCSHAU_trg_<table>_<event>` | `CCSHAU_trg_pages_update` |
| **RLS policies** | `CCSHAU_pol_<table>_<action>` | `CCSHAU_pol_pages_select` |
| **Indexes** | `CCSHAU_idx_<table>_<columns>` | `CCSHAU_idx_news_published_at` |
| **Sequences** | `CCSHAU_seq_<table>_<column>` | `CCSHAU_seq_audit_logs_id` |
| **Views** | `CCSHAU_v_<name>` | `CCSHAU_v_published_pages` |
| **Edge Functions** | `ccshau-<name>` | `ccshau-archive-expired` |

## PostgreSQL note

Unquoted identifiers are stored **lowercase**. Writing `CCSHAU_departments` in SQL creates `ccshau_departments`.  
Always use lowercase `ccshau_` in migrations and the TypeScript `Tables` constants in `apps/web/src/lib/database/names.ts`.

**Do not** create application tables without the prefix (e.g. `departments`, `profiles`).

## Exceptions (no prefix)

| Object | Reason |
|--------|--------|
| `auth.*` | Supabase Auth managed schema |
| `storage.*` | Supabase Storage managed schema |
| `extensions.*` | Postgres extensions |

## TypeScript usage

```typescript
import { Tables } from "@/lib/database/names";

const { data } = await supabase.from(Tables.departments).select("*");
// queries table: ccshau_departments
```

## SQL migration example

```sql
CREATE TABLE ccshau_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_hi text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_departments IS 'CCSHAU_ departments for RBAC and content ownership';

CREATE TRIGGER ccshau_trg_departments_updated_at
  BEFORE UPDATE ON ccshau_departments
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();
```

## Planned tables (Phase 2+)

| Table constant | PostgreSQL name |
|----------------|-----------------|
| `Tables.schemaMeta` | `ccshau_schema_meta` |
| `Tables.departments` | `ccshau_departments` |
| `Tables.profiles` | `ccshau_profiles` |
| `Tables.userRoles` | `ccshau_user_roles` |
| `Tables.pages` | `ccshau_pages` |
| `Tables.menus` | `ccshau_menus` |
| `Tables.menuItems` | `ccshau_menu_items` |
| `Tables.news` | `ccshau_news` |
| `Tables.circulars` | `ccshau_circulars` |
| `Tables.tenders` | `ccshau_tenders` |
| `Tables.tenderCorrigenda` | `ccshau_tender_corrigenda` |
| `Tables.downloads` | `ccshau_downloads` |
| `Tables.mediaAlbums` | `ccshau_media_albums` |
| `Tables.mediaItems` | `ccshau_media_items` |
| `Tables.banners` | `ccshau_banners` |
| `Tables.feedback` | `ccshau_feedback` |
| `Tables.relatedLinks` | `ccshau_related_links` |
| `Tables.auditLogs` | `ccshau_audit_logs` |
| `Tables.loginAttempts` | `ccshau_login_attempts` |
| `Tables.urlRedirects` | `ccshau_url_redirects` |

## Review checklist

- [ ] Every new migration uses `ccshau_` table names
- [ ] Every function uses `ccshau_` prefix
- [ ] App code uses `Tables.*` constants, not string literals
- [ ] RLS policies named with `ccshau_pol_` prefix
- [ ] Documentation references prefixed names
- [x] Phase 2 schema migration applied (`20260623120000`, `20260623130000`)
