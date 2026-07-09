-- Tender lifecycle: cancelled status, cancellation notice fields, close/archive automation

ALTER TYPE ccshau_tender_status ADD VALUE IF NOT EXISTS 'cancelled' AFTER 'closed';

ALTER TABLE ccshau_tenders
  ADD COLUMN IF NOT EXISTS cancellation_notice_en text,
  ADD COLUMN IF NOT EXISTS cancellation_notice_hi text,
  ADD COLUMN IF NOT EXISTS cancellation_document_path text,
  ADD COLUMN IF NOT EXISTS cancellation_document_name text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

COMMENT ON COLUMN ccshau_tenders.cancellation_notice_en IS 'Official cancellation notice (English)';
COMMENT ON COLUMN ccshau_tenders.cancellation_notice_hi IS 'Official cancellation notice (Hindi)';

-- Close expired open tenders, then archive closed tenders 30 days after closing date
CREATE OR REPLACE FUNCTION ccshau_process_expired_tenders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closed integer;
  v_archived integer;
BEGIN
  UPDATE ccshau_tenders
  SET status = 'closed', updated_at = now()
  WHERE status = 'open'
    AND closing_date IS NOT NULL
    AND closing_date < now();

  GET DIAGNOSTICS v_closed = ROW_COUNT;

  UPDATE ccshau_tenders
  SET status = 'archived', archived_at = now(), updated_at = now()
  WHERE status = 'closed'
    AND closing_date IS NOT NULL
    AND closing_date < (now() - interval '30 days');

  GET DIAGNOSTICS v_archived = ROW_COUNT;

  RETURN jsonb_build_object('closed', v_closed, 'archived', v_archived);
END;
$$;

-- Backward-compatible wrapper used by older references
CREATE OR REPLACE FUNCTION ccshau_archive_expired_tenders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := ccshau_process_expired_tenders();
  RETURN coalesce((v_result->>'closed')::integer, 0)
       + coalesce((v_result->>'archived')::integer, 0);
END;
$$;

-- Public read includes cancelled tenders
DROP POLICY IF EXISTS ccshau_pol_tenders_select_open ON ccshau_tenders;

CREATE POLICY ccshau_pol_tenders_select_open
  ON ccshau_tenders FOR SELECT TO anon
  USING (status IN ('open', 'closed', 'archived', 'cancelled'));

-- Daily at 00:30 IST (19:00 UTC) — requires pg_cron on Supabase project
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'ccshau-process-expired-tenders';

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'ccshau-process-expired-tenders',
    '0 19 * * *',
    $$SELECT public.ccshau_process_expired_tenders()$$
  );
END $$;
