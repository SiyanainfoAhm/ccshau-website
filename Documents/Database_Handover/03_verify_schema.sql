-- =============================================================================
-- CCSHAU — post-apply schema verification
-- Run in SQL Editor after 01_ccshau_full_database.sql (or 01a + 02)
-- =============================================================================

-- Tables (expect 36)
SELECT COUNT(*) AS ccshau_table_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'ccshau_%';

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'ccshau_%'
ORDER BY table_name;

-- Functions (expect 14)
SELECT COUNT(*) AS ccshau_function_count
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'ccshau_%';

SELECT p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'ccshau_%'
ORDER BY p.proname;

-- Triggers (expect 35)
SELECT COUNT(*) AS ccshau_trigger_count
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal AND t.tgname LIKE 'ccshau_%';

-- RLS policies (expect ~53 named ccshau_*)
SELECT COUNT(*) AS ccshau_policy_count
FROM pg_policies
WHERE schemaname = 'public' AND policyname LIKE 'ccshau_%';

-- Enums / types (expect 15)
SELECT n.nspname AS schema, t.typname AS type_name
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typname LIKE 'ccshau_%'
ORDER BY t.typname;

-- Storage buckets expected by the app
SELECT id, name, public
FROM storage.buckets
WHERE id IN ('ccshau-public', 'ccshau-private', 'ccshau-media')
ORDER BY id;

-- Baseline rows (may be 0 if schema-only script was used without inserts)
SELECT 'departments' AS entity, COUNT(*) AS n FROM ccshau_departments
UNION ALL SELECT 'menus', COUNT(*) FROM ccshau_menus
UNION ALL SELECT 'site_settings', COUNT(*) FROM ccshau_site_settings
UNION ALL SELECT 'pages', COUNT(*) FROM ccshau_pages;

-- =============================================================================
-- Phase A security locks (from 20260723140000_security_phase_a_locks.sql)
-- Client should confirm: RLS on download_versions; sensitive RPCs not executable by anon
-- =============================================================================

-- Expect rls_on = true
SELECT c.relname AS table_name, c.relrowsecurity AS rls_on
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'ccshau_download_versions';

-- Expect: no grants to anon/authenticated; service_role has access
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'ccshau_download_versions'
  AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
ORDER BY grantee, privilege_type;

-- Expect: anon/authenticated can_exec = false; service_role = true
SELECT p.proname,
       r.rolname AS grantee,
       has_function_privilege(r.oid, p.oid, 'EXECUTE') AS can_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN pg_roles r
WHERE n.nspname = 'public'
  AND p.proname IN (
    'ccshau_get_vault_secret',
    'ccshau_write_audit_log',
    'ccshau_generate_ticket_number',
    'ccshau_archive_expired_news',
    'ccshau_archive_expired_tenders',
    'ccshau_archive_expired_downloads'
  )
  AND r.rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY p.proname, r.rolname;
