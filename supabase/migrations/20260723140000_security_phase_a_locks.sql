-- Phase A security lockdown:
-- 1) Enable RLS on download_versions; revoke anon/authenticated DML
-- 2) Revoke EXECUTE on sensitive SECURITY DEFINER helpers from PUBLIC/anon/authenticated

-- ---------------------------------------------------------------------------
-- A1: ccshau_download_versions
-- ---------------------------------------------------------------------------

ALTER TABLE public.ccshau_download_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ccshau_download_versions FROM PUBLIC;
REVOKE ALL ON TABLE public.ccshau_download_versions FROM anon;
REVOKE ALL ON TABLE public.ccshau_download_versions FROM authenticated;

-- Service role bypasses RLS; keep explicit grants for clarity in PostgREST.
GRANT ALL ON TABLE public.ccshau_download_versions TO service_role;

-- Authenticated CMS users should not hit this table via PostgREST; app uses service role.
-- No policies for anon/authenticated = deny by default with RLS enabled.

COMMENT ON TABLE public.ccshau_download_versions IS
  'CCSHAU_ prior file revisions for downloads (service_role only via app)';

-- ---------------------------------------------------------------------------
-- A2: Restrict sensitive RPCs to service_role
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'ccshau_get_vault_secret(text)',
    'ccshau_write_audit_log(uuid, text, text, uuid, jsonb, inet, text)',
    'ccshau_archive_expired_news()',
    'ccshau_archive_expired_tenders()',
    'ccshau_archive_expired_downloads()',
    'ccshau_generate_ticket_number()'
  ]
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM anon', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
    EXCEPTION
      WHEN undefined_function THEN
        -- Signature may differ slightly across environments; continue.
        NULL;
    END;
  END LOOP;
END
$$;

-- Also revoke by name for any overloaded / alternate signatures using oid lookup
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS regproc
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'ccshau_get_vault_secret',
        'ccshau_write_audit_log',
        'ccshau_archive_expired_news',
        'ccshau_archive_expired_tenders',
        'ccshau_archive_expired_downloads',
        'ccshau_generate_ticket_number'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.regproc);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.regproc);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.regproc);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.regproc);
  END LOOP;
END
$$;
