-- Downloads repository: tags, expiry, visibility, version history, archive automation

ALTER TABLE ccshau_downloads
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

COMMENT ON COLUMN ccshau_downloads.tags IS 'Searchable document tags';
COMMENT ON COLUMN ccshau_downloads.is_public IS 'When false, file stays private even if published (admin-only access)';
COMMENT ON COLUMN ccshau_downloads.expires_at IS 'Optional expiry; auto-archived by scheduled job';

CREATE INDEX IF NOT EXISTS ccshau_idx_downloads_tags
  ON ccshau_downloads USING gin (tags);

CREATE INDEX IF NOT EXISTS ccshau_idx_downloads_expires_at
  ON ccshau_downloads (expires_at)
  WHERE status = 'published' AND expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS ccshau_download_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  download_id uuid NOT NULL REFERENCES ccshau_downloads (id) ON DELETE CASCADE,
  version_label text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_download_versions IS 'CCSHAU_ prior file revisions for downloads';

CREATE INDEX IF NOT EXISTS ccshau_idx_download_versions_download_id
  ON ccshau_download_versions (download_id);

-- Include tags in full-text search vector
CREATE OR REPLACE FUNCTION ccshau_update_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'ccshau_pages' THEN
    NEW.search_vector :=
      setweight(to_tsvector('english', coalesce(NEW.title_en, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(NEW.excerpt_en, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(NEW.content_en, '')), 'C');
  ELSIF TG_TABLE_NAME = 'ccshau_news' THEN
    NEW.search_vector :=
      setweight(to_tsvector('english', coalesce(NEW.title_en, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(NEW.body_en, '')), 'B');
  ELSIF TG_TABLE_NAME = 'ccshau_tenders' THEN
    NEW.search_vector :=
      setweight(to_tsvector('english', coalesce(NEW.title_en, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(NEW.description_en, '')), 'B');
  ELSIF TG_TABLE_NAME = 'ccshau_circulars' THEN
    NEW.search_vector :=
      setweight(to_tsvector('english', coalesce(NEW.title_en, '')), 'A');
  ELSIF TG_TABLE_NAME = 'ccshau_downloads' THEN
    NEW.search_vector :=
      setweight(to_tsvector('english', coalesce(NEW.title_en, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(NEW.category, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'B');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ccshau_trg_downloads_search_vector ON ccshau_downloads;

CREATE TRIGGER ccshau_trg_downloads_search_vector
  BEFORE INSERT OR UPDATE OF title_en, category, tags ON ccshau_downloads
  FOR EACH ROW EXECUTE FUNCTION ccshau_update_search_vector();

-- Backfill search vectors for existing downloads
UPDATE ccshau_downloads
SET search_vector =
  setweight(to_tsvector('english', coalesce(title_en, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'B');

-- Public anon access: published, explicitly public, not expired
DROP POLICY IF EXISTS ccshau_pol_downloads_select_published ON ccshau_downloads;

CREATE POLICY ccshau_pol_downloads_select_published
  ON ccshau_downloads FOR SELECT TO anon
  USING (
    status = 'published'
    AND is_public = true
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE OR REPLACE FUNCTION ccshau_increment_download_count(p_download_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ccshau_downloads
  SET download_count = download_count + 1
  WHERE id = p_download_id
    AND status = 'published'
    AND is_public = true;
END;
$$;

CREATE OR REPLACE FUNCTION ccshau_archive_expired_downloads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE ccshau_downloads
  SET status = 'archived', updated_at = now()
  WHERE status = 'published'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Daily at 01:00 IST (19:30 UTC previous day) — archive expired downloads
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'ccshau-archive-expired-downloads';

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'ccshau-archive-expired-downloads',
    '30 19 * * *',
    $$SELECT public.ccshau_archive_expired_downloads()$$
  );
END $$;
