-- =============================================================================
-- CCSHAU Website CMS — FINAL DATABASE SCRIPT (Client Handover)
-- =============================================================================
-- Generated: 2026-07-29
-- Source: supabase/migrations/*.sql (chronological)
-- Naming: all application objects use ccshau_ prefix
--
-- PREREQUISITES (Supabase Cloud project — not plain PostgreSQL alone):
--   1. Supabase project with Auth + Storage enabled
--   2. Extensions: pgcrypto/uuid-ossp as provided by Supabase; vault + pg_cron optional
--   3. Run as postgres / SQL Editor (Dashboard) or psql with database URL
--
-- HOW TO APPLY:
--   A) Supabase Dashboard → SQL Editor → run this file (split into batches if needed)
--   B) psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <this-file>
--   C) Preferred for new envs: npx supabase link && npx supabase db push
--
-- AFTER APPLY:
--   1. Create first Auth user, then ccshau_profiles + ccshau_user_roles (super_admin)
--   2. Confirm storage buckets: ccshau-public, ccshau-private, ccshau-media
--   3. Optional demo content: 02_ccshau_demo_seed_data.sql
--   4. Configure Vault secret for Google Translate if auto-translate is used
--
-- NOTE: Includes ALL migrations (schema + baseline + demo/college seed content).
-- =============================================================================

SET client_min_messages TO WARNING;



-- #############################################################################
-- Migration: 20260623100000_phase_0_init.sql
-- #############################################################################

-- Phase 0 marker migration
-- Full CMS schema will be added in Phase 2

select 1 as phase_0_initialized;


-- #############################################################################
-- Migration: 20260623110000_ccshau_naming_convention.sql
-- #############################################################################

-- =============================================================================
-- CCSHAU_ naming convention — registry and shared functions
-- All application tables MUST use prefix: ccshau_ (documented as CCSHAU_)
-- =============================================================================

-- Registry table (documents naming standard in the database)
CREATE TABLE IF NOT EXISTS ccshau_schema_meta (
  id integer PRIMARY KEY DEFAULT 1,
  naming_prefix text NOT NULL DEFAULT 'CCSHAU_',
  pg_prefix text NOT NULL DEFAULT 'ccshau_',
  schema_version text NOT NULL DEFAULT '0.1.0',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ccshau_schema_meta_singleton CHECK (id = 1)
);

COMMENT ON TABLE ccshau_schema_meta IS 'CCSHAU_ schema metadata — naming prefix registry';
COMMENT ON COLUMN ccshau_schema_meta.naming_prefix IS 'Documented prefix for all application objects (CCSHAU_)';
COMMENT ON COLUMN ccshau_schema_meta.pg_prefix IS 'PostgreSQL identifier prefix (ccshau_, lowercase)';

INSERT INTO ccshau_schema_meta (id, naming_prefix, pg_prefix, schema_version)
VALUES (1, 'CCSHAU_', 'ccshau_', '0.1.0')
ON CONFLICT (id) DO NOTHING;

-- Shared function: auto-update updated_at column
CREATE OR REPLACE FUNCTION ccshau_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ccshau_set_updated_at() IS 'CCSHAU_ trigger function — sets updated_at on row update';

-- Enable RLS on registry table
ALTER TABLE ccshau_schema_meta ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users; writes via service role only
CREATE POLICY ccshau_pol_schema_meta_select_authenticated
  ON ccshau_schema_meta
  FOR SELECT
  TO authenticated
  USING (true);


-- #############################################################################
-- Migration: 20260623120000_phase_2_schema.sql
-- #############################################################################

-- =============================================================================
-- Phase 2 — CCSHAU CMS schema (tables, indexes, updated_at triggers)
-- Deliverable D3 — Database design
-- =============================================================================

-- Bump schema version
UPDATE ccshau_schema_meta
SET schema_version = '2.0.0', updated_at = now()
WHERE id = 1;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE ccshau_content_status AS ENUM (
    'draft', 'pending_review', 'published', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ccshau_user_role AS ENUM (
    'super_admin', 'dept_admin', 'editor', 'viewer'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ccshau_menu_location AS ENUM (
    'header', 'footer', 'quick_links'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ccshau_notice_type AS ENUM (
    'news', 'notice', 'corrigendum', 'cancellation'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ccshau_tender_status AS ENUM (
    'draft', 'open', 'closed', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ccshau_feedback_status AS ENUM (
    'new', 'in_progress', 'resolved', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ccshau_media_album_type AS ENUM (
    'photo', 'video', 'press_release', 'event'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ccshau_audit_action AS ENUM (
    'login', 'logout', 'create', 'update', 'delete',
    'publish', 'unpublish', 'upload', 'archive', 'lockout'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Reference: departments
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ccshau_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_hi text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_departments IS 'CCSHAU_ organizational units for RBAC and content ownership';

CREATE TRIGGER ccshau_trg_departments_updated_at
  BEFORE UPDATE ON ccshau_departments
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

-- -----------------------------------------------------------------------------
-- Auth extension: profiles & roles
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ccshau_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text NOT NULL,
  department_id uuid REFERENCES ccshau_departments (id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_profiles IS 'CCSHAU_ admin user profiles linked to auth.users';

CREATE INDEX IF NOT EXISTS ccshau_idx_profiles_department_id
  ON ccshau_profiles (department_id);

CREATE TRIGGER ccshau_trg_profiles_updated_at
  BEFORE UPDATE ON ccshau_profiles
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TABLE IF NOT EXISTS ccshau_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role ccshau_user_role NOT NULL,
  department_id uuid REFERENCES ccshau_departments (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, department_id)
);

COMMENT ON TABLE ccshau_user_roles IS 'CCSHAU_ RBAC role assignments per user and department';

CREATE INDEX IF NOT EXISTS ccshau_idx_user_roles_user_id
  ON ccshau_user_roles (user_id);

-- -----------------------------------------------------------------------------
-- Pages CMS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ccshau_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_en text NOT NULL,
  title_hi text,
  content_en text,
  content_hi text,
  excerpt_en text,
  excerpt_hi text,
  meta_title text,
  meta_description text,
  department_id uuid REFERENCES ccshau_departments (id) ON DELETE SET NULL,
  content_owner_id uuid REFERENCES ccshau_profiles (id) ON DELETE SET NULL,
  parent_id uuid REFERENCES ccshau_pages (id) ON DELETE SET NULL,
  status ccshau_content_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  featured_image_path text,
  sort_order integer NOT NULL DEFAULT 0,
  search_vector tsvector,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_pages IS 'CCSHAU_ CMS-managed pages';

CREATE INDEX IF NOT EXISTS ccshau_idx_pages_status ON ccshau_pages (status);
CREATE INDEX IF NOT EXISTS ccshau_idx_pages_department_id ON ccshau_pages (department_id);
CREATE INDEX IF NOT EXISTS ccshau_idx_pages_published_at ON ccshau_pages (published_at DESC);
CREATE INDEX IF NOT EXISTS ccshau_idx_pages_search_vector ON ccshau_pages USING gin (search_vector);

CREATE TRIGGER ccshau_trg_pages_updated_at
  BEFORE UPDATE ON ccshau_pages
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

-- -----------------------------------------------------------------------------
-- Menus
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ccshau_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location ccshau_menu_location NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_hi text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_menus IS 'CCSHAU_ navigation menus (header, footer, quick links)';

CREATE TRIGGER ccshau_trg_menus_updated_at
  BEFORE UPDATE ON ccshau_menus
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TABLE IF NOT EXISTS ccshau_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES ccshau_menus (id) ON DELETE CASCADE,
  parent_id uuid REFERENCES ccshau_menu_items (id) ON DELETE CASCADE,
  label_en text NOT NULL,
  label_hi text,
  href text,
  page_id uuid REFERENCES ccshau_pages (id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  open_in_new_tab boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_menu_items IS 'CCSHAU_ hierarchical menu items';

CREATE INDEX IF NOT EXISTS ccshau_idx_menu_items_menu_id ON ccshau_menu_items (menu_id);
CREATE INDEX IF NOT EXISTS ccshau_idx_menu_items_parent_id ON ccshau_menu_items (parent_id);

CREATE TRIGGER ccshau_trg_menu_items_updated_at
  BEFORE UPDATE ON ccshau_menu_items
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

-- -----------------------------------------------------------------------------
-- News & notices
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ccshau_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_en text NOT NULL,
  title_hi text,
  body_en text,
  body_hi text,
  notice_type ccshau_notice_type NOT NULL DEFAULT 'news',
  category text,
  department_id uuid REFERENCES ccshau_departments (id) ON DELETE SET NULL,
  content_owner_id uuid REFERENCES ccshau_profiles (id) ON DELETE SET NULL,
  status ccshau_content_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  is_featured boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  attachment_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  search_vector tsvector,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_news IS 'CCSHAU_ news, notices, corrigenda, cancellations';

CREATE INDEX IF NOT EXISTS ccshau_idx_news_status ON ccshau_news (status);
CREATE INDEX IF NOT EXISTS ccshau_idx_news_published_at ON ccshau_news (published_at DESC);
CREATE INDEX IF NOT EXISTS ccshau_idx_news_expires_at ON ccshau_news (expires_at)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS ccshau_idx_news_search_vector ON ccshau_news USING gin (search_vector);

CREATE TRIGGER ccshau_trg_news_updated_at
  BEFORE UPDATE ON ccshau_news
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

-- -----------------------------------------------------------------------------
-- Circulars
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ccshau_circulars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circular_number text,
  title_en text NOT NULL,
  title_hi text,
  file_path text,
  file_name text,
  file_size bigint,
  department_id uuid REFERENCES ccshau_departments (id) ON DELETE SET NULL,
  status ccshau_content_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  search_vector tsvector,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_circulars IS 'CCSHAU_ official circulars';

CREATE INDEX IF NOT EXISTS ccshau_idx_circulars_status ON ccshau_circulars (status);
CREATE INDEX IF NOT EXISTS ccshau_idx_circulars_search_vector ON ccshau_circulars USING gin (search_vector);

CREATE TRIGGER ccshau_trg_circulars_updated_at
  BEFORE UPDATE ON ccshau_circulars
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

-- -----------------------------------------------------------------------------
-- Tenders
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ccshau_tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_number text,
  slug text NOT NULL UNIQUE,
  title_en text NOT NULL,
  title_hi text,
  description_en text,
  description_hi text,
  category text,
  department_id uuid REFERENCES ccshau_departments (id) ON DELETE SET NULL,
  content_owner_id uuid REFERENCES ccshau_profiles (id) ON DELETE SET NULL,
  status ccshau_tender_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  closing_date timestamptz,
  archived_at timestamptz,
  document_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  search_vector tsvector,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_tenders IS 'CCSHAU_ tenders';

CREATE INDEX IF NOT EXISTS ccshau_idx_tenders_status ON ccshau_tenders (status);
CREATE INDEX IF NOT EXISTS ccshau_idx_tenders_closing_date ON ccshau_tenders (closing_date)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS ccshau_idx_tenders_search_vector ON ccshau_tenders USING gin (search_vector);

CREATE TRIGGER ccshau_trg_tenders_updated_at
  BEFORE UPDATE ON ccshau_tenders
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TABLE IF NOT EXISTS ccshau_tender_corrigenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES ccshau_tenders (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_path text,
  file_name text,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_tender_corrigenda IS 'CCSHAU_ tender corrigenda';

CREATE INDEX IF NOT EXISTS ccshau_idx_tender_corrigenda_tender_id
  ON ccshau_tender_corrigenda (tender_id);

-- -----------------------------------------------------------------------------
-- Downloads
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ccshau_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_hi text,
  category text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  version text,
  department_id uuid REFERENCES ccshau_departments (id) ON DELETE SET NULL,
  status ccshau_content_status NOT NULL DEFAULT 'draft',
  download_count bigint NOT NULL DEFAULT 0,
  search_vector tsvector,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_downloads IS 'CCSHAU_ downloadable documents repository';

CREATE INDEX IF NOT EXISTS ccshau_idx_downloads_category ON ccshau_downloads (category);
CREATE INDEX IF NOT EXISTS ccshau_idx_downloads_search_vector ON ccshau_downloads USING gin (search_vector);

CREATE TRIGGER ccshau_trg_downloads_updated_at
  BEFORE UPDATE ON ccshau_downloads
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

-- -----------------------------------------------------------------------------
-- Media
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ccshau_media_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_en text NOT NULL,
  title_hi text,
  album_type ccshau_media_album_type NOT NULL DEFAULT 'photo',
  event_date date,
  department_id uuid REFERENCES ccshau_departments (id) ON DELETE SET NULL,
  cover_image_path text,
  status ccshau_content_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_media_albums IS 'CCSHAU_ photo/video/press albums';

CREATE TRIGGER ccshau_trg_media_albums_updated_at
  BEFORE UPDATE ON ccshau_media_albums
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TABLE IF NOT EXISTS ccshau_media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES ccshau_media_albums (id) ON DELETE CASCADE,
  title_en text,
  title_hi text,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  storage_path text NOT NULL,
  thumbnail_path text,
  caption_en text,
  caption_hi text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_media_items IS 'CCSHAU_ media album items';

CREATE INDEX IF NOT EXISTS ccshau_idx_media_items_album_id ON ccshau_media_items (album_id);

CREATE TRIGGER ccshau_trg_media_items_updated_at
  BEFORE UPDATE ON ccshau_media_items
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

-- -----------------------------------------------------------------------------
-- Banners & related links
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ccshau_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_path text NOT NULL,
  target_url text,
  alt_text text,
  start_date timestamptz,
  end_date timestamptz,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_banners IS 'CCSHAU_ homepage and campaign banners';

CREATE INDEX IF NOT EXISTS ccshau_idx_banners_active ON ccshau_banners (priority DESC)
  WHERE is_active = true;

CREATE TRIGGER ccshau_trg_banners_updated_at
  BEFORE UPDATE ON ccshau_banners
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TABLE IF NOT EXISTS ccshau_related_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_hi text,
  url text NOT NULL,
  category text,
  sort_order integer NOT NULL DEFAULT 0,
  is_external boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_related_links IS 'CCSHAU_ government and institutional links';

CREATE TRIGGER ccshau_trg_related_links_updated_at
  BEFORE UPDATE ON ccshau_related_links
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

-- -----------------------------------------------------------------------------
-- Feedback
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ccshau_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  category text,
  department_id uuid REFERENCES ccshau_departments (id) ON DELETE SET NULL,
  submitter_name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status ccshau_feedback_status NOT NULL DEFAULT 'new',
  admin_remarks text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_feedback IS 'CCSHAU_ public feedback submissions';

CREATE INDEX IF NOT EXISTS ccshau_idx_feedback_status ON ccshau_feedback (status);
CREATE INDEX IF NOT EXISTS ccshau_idx_feedback_created_at ON ccshau_feedback (created_at DESC);

CREATE TRIGGER ccshau_trg_feedback_updated_at
  BEFORE UPDATE ON ccshau_feedback
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

-- -----------------------------------------------------------------------------
-- Audit, login attempts, redirects
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ccshau_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  action ccshau_audit_action NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_audit_logs IS 'CCSHAU_ security and CMS audit trail (append-only)';

CREATE INDEX IF NOT EXISTS ccshau_idx_audit_logs_user_id ON ccshau_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS ccshau_idx_audit_logs_created_at ON ccshau_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS ccshau_idx_audit_logs_entity ON ccshau_audit_logs (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS ccshau_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_login_attempts IS 'CCSHAU_ admin login attempt tracking for lockout';

CREATE INDEX IF NOT EXISTS ccshau_idx_login_attempts_email_time
  ON ccshau_login_attempts (email, attempted_at DESC);

CREATE TABLE IF NOT EXISTS ccshau_url_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_path text NOT NULL UNIQUE,
  new_path text NOT NULL,
  redirect_type smallint NOT NULL DEFAULT 301 CHECK (redirect_type IN (301, 302)),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_url_redirects IS 'CCSHAU_ legacy URL to new URL redirect map';

CREATE INDEX IF NOT EXISTS ccshau_idx_url_redirects_legacy_active
  ON ccshau_url_redirects (legacy_path) WHERE is_active = true;

CREATE TRIGGER ccshau_trg_url_redirects_updated_at
  BEFORE UPDATE ON ccshau_url_redirects
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();


-- #############################################################################
-- Migration: 20260623130000_phase_2_rls_functions.sql
-- #############################################################################

-- =============================================================================
-- Phase 2 — RLS policies, helper functions, search triggers, seed data
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: check super_admin role
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ccshau_is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ccshau_user_roles
    WHERE user_id = p_user_id AND role = 'super_admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Helper: user department IDs (including NULL for super_admin = all)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ccshau_user_department_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM ccshau_user_roles
  WHERE user_id = p_user_id AND department_id IS NOT NULL
  UNION
  SELECT id FROM ccshau_departments
  WHERE ccshau_is_super_admin(p_user_id);
$$;

-- -----------------------------------------------------------------------------
-- Audit log writer
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ccshau_write_audit_log(
  p_user_id uuid,
  p_action ccshau_audit_action,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO ccshau_audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_details, p_ip_address)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION ccshau_write_audit_log IS 'CCSHAU_ append audit log entry';

-- -----------------------------------------------------------------------------
-- Feedback ticket number generator
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ccshau_generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date text := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYYMMDD');
  v_seq int;
BEGIN
  SELECT count(*) + 1 INTO v_seq
  FROM ccshau_feedback
  WHERE ticket_number LIKE 'CCSHAU-' || v_date || '-%';
  RETURN 'CCSHAU-' || v_date || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

-- -----------------------------------------------------------------------------
-- Archive expired content
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ccshau_archive_expired_news()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE ccshau_news
  SET status = 'archived', updated_at = now()
  WHERE status = 'published'
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION ccshau_archive_expired_tenders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE ccshau_tenders
  SET status = 'archived', archived_at = now(), updated_at = now()
  WHERE status = 'open'
    AND closing_date IS NOT NULL
    AND closing_date < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- Full-text search vector updater
-- -----------------------------------------------------------------------------

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
      setweight(to_tsvector('english', coalesce(NEW.category, '')), 'B');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ccshau_trg_pages_search_vector
  BEFORE INSERT OR UPDATE OF title_en, excerpt_en, content_en ON ccshau_pages
  FOR EACH ROW EXECUTE FUNCTION ccshau_update_search_vector();

CREATE TRIGGER ccshau_trg_news_search_vector
  BEFORE INSERT OR UPDATE OF title_en, body_en ON ccshau_news
  FOR EACH ROW EXECUTE FUNCTION ccshau_update_search_vector();

CREATE TRIGGER ccshau_trg_tenders_search_vector
  BEFORE INSERT OR UPDATE OF title_en, description_en ON ccshau_tenders
  FOR EACH ROW EXECUTE FUNCTION ccshau_update_search_vector();

CREATE TRIGGER ccshau_trg_circulars_search_vector
  BEFORE INSERT OR UPDATE OF title_en ON ccshau_circulars
  FOR EACH ROW EXECUTE FUNCTION ccshau_update_search_vector();

CREATE TRIGGER ccshau_trg_downloads_search_vector
  BEFORE INSERT OR UPDATE OF title_en, category ON ccshau_downloads
  FOR EACH ROW EXECUTE FUNCTION ccshau_update_search_vector();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE ccshau_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_circulars ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_tender_corrigenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_media_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_related_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_url_redirects ENABLE ROW LEVEL SECURITY;

-- Departments: public read active
CREATE POLICY ccshau_pol_departments_select_anon
  ON ccshau_departments FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY ccshau_pol_departments_select_authenticated
  ON ccshau_departments FOR SELECT TO authenticated
  USING (true);

-- Profiles: own profile only
CREATE POLICY ccshau_pol_profiles_select_own
  ON ccshau_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR ccshau_is_super_admin(auth.uid()));

-- User roles: own roles or super_admin
CREATE POLICY ccshau_pol_user_roles_select
  ON ccshau_user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR ccshau_is_super_admin(auth.uid()));

-- Published content: public read
CREATE POLICY ccshau_pol_pages_select_published
  ON ccshau_pages FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY ccshau_pol_news_select_published
  ON ccshau_news FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY ccshau_pol_circulars_select_published
  ON ccshau_circulars FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY ccshau_pol_tenders_select_open
  ON ccshau_tenders FOR SELECT TO anon
  USING (status IN ('open', 'closed', 'archived'));

CREATE POLICY ccshau_pol_downloads_select_published
  ON ccshau_downloads FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY ccshau_pol_media_albums_select_published
  ON ccshau_media_albums FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY ccshau_pol_media_items_select_published
  ON ccshau_media_items FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM ccshau_media_albums a
      WHERE a.id = album_id AND a.status = 'published'
    )
  );

CREATE POLICY ccshau_pol_banners_select_active
  ON ccshau_banners FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY ccshau_pol_related_links_select_active
  ON ccshau_related_links FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY ccshau_pol_menus_select_active
  ON ccshau_menus FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY ccshau_pol_menu_items_select_active
  ON ccshau_menu_items FOR SELECT TO anon
  USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM ccshau_menus m
      WHERE m.id = menu_id AND m.is_active = true
    )
  );

CREATE POLICY ccshau_pol_tender_corrigenda_select
  ON ccshau_tender_corrigenda FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM ccshau_tenders t
      WHERE t.id = tender_id AND t.status IN ('open', 'closed', 'archived')
    )
  );

-- Feedback: public insert only
CREATE POLICY ccshau_pol_feedback_insert_anon
  ON ccshau_feedback FOR INSERT TO anon
  WITH CHECK (true);

-- URL redirects: public read for middleware
CREATE POLICY ccshau_pol_url_redirects_select_active
  ON ccshau_url_redirects FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Authenticated CMS read (all rows for admins — writes via service role)
CREATE POLICY ccshau_pol_pages_select_authenticated
  ON ccshau_pages FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_news_select_authenticated
  ON ccshau_news FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_tenders_select_authenticated
  ON ccshau_tenders FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_circulars_select_authenticated
  ON ccshau_circulars FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_downloads_select_authenticated
  ON ccshau_downloads FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_feedback_select_authenticated
  ON ccshau_feedback FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_audit_logs_select_super_admin
  ON ccshau_audit_logs FOR SELECT TO authenticated
  USING (ccshau_is_super_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- Seed: departments
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_departments (slug, name_en, name_hi, sort_order) VALUES
  ('university-admin', 'University Administration', 'विश्वविद्यालय प्रशासन', 1),
  ('registrar', 'Registrar', 'कुलसचिव', 2),
  ('research', 'Directorate of Research', 'अनुसंधान निदेशालय', 3),
  ('extension', 'Directorate of Extension Education', 'विस्तार शिक्षा निदेशालय', 4),
  ('academics', 'Academics', 'शिक्षा', 5),
  ('examination', 'Examination Branch', 'परीक्षा शाखा', 6)
ON CONFLICT (slug) DO NOTHING;

-- Seed: empty menu shells
INSERT INTO ccshau_menus (location, name_en, name_hi) VALUES
  ('header', 'Main Navigation', 'मुख्य नेविगेशन'),
  ('footer', 'Footer Links', 'फुटर लिंक'),
  ('quick_links', 'Quick Links', 'त्वरित लिंक')
ON CONFLICT (location) DO NOTHING;

-- Seed: starter URL redirects
INSERT INTO ccshau_url_redirects (legacy_path, new_path, redirect_type, notes) VALUES
  ('/index.aspx', '/', 301, 'Legacy homepage'),
  ('/Default.aspx', '/', 301, 'Legacy homepage'),
  ('/NoticeBoard.aspx', '/news', 301, 'Legacy notices'),
  ('/Tender.aspx', '/tenders', 301, 'Legacy tenders'),
  ('/Circular.aspx', '/circulars', 301, 'Legacy circulars'),
  ('/Contact.aspx', '/contact', 301, 'Legacy contact')
ON CONFLICT (legacy_path) DO NOTHING;


-- #############################################################################
-- Migration: 20260624120000_site_settings.sql
-- #############################################################################

-- =============================================================================
-- CCSHAU_ site settings — feature flags for CAPTCHA and email (Power Automate)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ccshau_site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  captcha_enabled boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT ccshau_site_settings_singleton CHECK (id = 1)
);

COMMENT ON TABLE ccshau_site_settings IS 'CCSHAU_ singleton — runtime feature flags (CAPTCHA, Power Automate email)';
COMMENT ON COLUMN ccshau_site_settings.captcha_enabled IS 'When true, verify reCAPTCHA on login and public feedback';
COMMENT ON COLUMN ccshau_site_settings.email_enabled IS 'When true, dispatch emails via Power Automate webhooks';

INSERT INTO ccshau_site_settings (id, captcha_enabled, email_enabled)
VALUES (1, false, false)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER ccshau_trg_site_settings_updated_at
  BEFORE UPDATE ON ccshau_site_settings
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_site_settings_select_authenticated
  ON ccshau_site_settings FOR SELECT TO authenticated
  USING (ccshau_is_super_admin(auth.uid()));


-- #############################################################################
-- Migration: 20260624120000_storage_buckets.sql
-- #############################################################################

-- CCSHAU Storage buckets (Phase 3)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('ccshau-public', 'ccshau-public', true, 26214400),
  ('ccshau-private', 'ccshau-private', false, 26214400),
  ('ccshau-media', 'ccshau-media', true, 104857600)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS ccshau_storage_public_read ON storage.objects;
CREATE POLICY ccshau_storage_public_read
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('ccshau-public', 'ccshau-media'));


-- #############################################################################
-- Migration: 20260624140000_demo_content_seed.sql
-- #############################################################################

-- =============================================================================
-- Demo content seed — 2 published items per public CMS module + homepage pages
-- Safe to re-run: ON CONFLICT (slug) DO NOTHING where applicable
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CMS pages (about, colleges parent + 2 children, + 2 general pages)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  status, published_at, sort_order
) VALUES
  (
    'about',
    'About HAU',
    'एचएयू के बारे में',
    'Chaudhary Charan Singh Haryana Agricultural University is one of Asia''s largest agricultural universities, located at Hisar.',
    'चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय एशिया के सबसे बड़े कृषि विश्वविद्यालयों में से एक है।',
    '<p>Chaudhary Charan Singh Haryana Agricultural University, popularly known as HAU, is one of Asia''s biggest agricultural universities, located at Hisar in Haryana. It is named after India''s seventh Prime Minister, Chaudhary Charan Singh.</p><p>A leader in agricultural research, HAU contributed significantly to the Green Revolution and White Revolution in India. The university became an autonomous institution on 2 February 1970.</p>',
    '<p>लोकप्रिय रूप से एचएयू के नाम से जाना जाने वाला चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय हरियाणा के हिसार में स्थित है।</p>',
    'published', now(), 1
  ),
  (
    'colleges',
    'Colleges',
    'महाविद्यालय',
    'Nine colleges offering agricultural education and research across Hisar, Kaul and Bawal.',
    'हिसार, कौल और बावल में कृषि शिक्षा और अनुसंधान के लिए नौ महाविद्यालय।',
    '<p>CCSHAU comprises constituent colleges in agriculture, basic sciences, community science, engineering, fisheries, biotechnology and food science.</p>',
    '<p>सीसीएसएचएयू में कृषि, मूल विज्ञान, समुदाय विज्ञान, अभियांत्रिकी, मत्स्य, जैव प्रौद्योगिकी और खाद्य विज्ञान के महाविद्यालय शामिल हैं।',
    'published', now(), 2
  ),
  (
    'vision-mission',
    'Vision & Mission',
    'दृष्टि और मिशन',
    'Our vision is to be a global leader in agricultural education, research and extension.',
    'कृषि शिक्षा, अनुसंधान और विस्तार में वैश्विक नेतृत्व करना हमारी दृष्टि है।',
    '<p><strong>Vision:</strong> To excel in agricultural education, research and outreach for sustainable farming and rural prosperity.</p><p><strong>Mission:</strong> To develop human resources, generate technologies and disseminate knowledge for the farming community of Haryana and India.</p>',
    '<p><strong>दृष्टि:</strong> कृषि शिक्षा, अनुसंधान और जन-जागरूकता में उत्कृष्टता।</p><p><strong>मिशन:</strong> मानव संसाधन विकास और किसानों के लिए ज्ञान प्रसार।</p>',
    'published', now(), 3
  ),
  (
    'history',
    'University History',
    'विश्वविद्यालय का इतिहास',
    'From Punjab Agricultural University campus to autonomous HAU in 1970.',
    'पंजाब कृषि विश्वविद्यालय परिसर से 1970 में स्वायत्त एचएयू।',
    '<p>HAU was initially a campus of Punjab Agricultural University, Ludhiana. After the formation of Haryana in 1966, it became an autonomous institution on 2 February 1970 under Haryana and Punjab Agricultural Universities Act.</p>',
    '<p>एचएयू की शुरुआत पंजाब कृषि विश्वविद्यालय, लुधियाना के परिसर से हुई। 1966 में हरियाणा के गठन के बाद 2 फरवरी 1970 को यह स्वायत्त संस्थान बना।</p>',
    'published', now(), 4
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  parent_id, status, published_at, sort_order
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  v.excerpt_en,
  v.excerpt_hi,
  v.content_en,
  v.content_hi,
  p.id,
  'published',
  now(),
  v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'college-of-agriculture-hisar',
      'College of Agriculture, Hisar',
      'कृषि महाविद्यालय, हिसार',
      'Undergraduate and postgraduate programmes in agriculture at the main Hisar campus.',
      'हिसार परिसर में कृषि के स्नातक और स्नातकोत्तर कार्यक्रम।',
      '<p>The College of Agriculture, Hisar is the flagship college of CCSHAU offering B.Sc. (Hons.) Agriculture, M.Sc. and Ph.D. programmes.</p>',
      '<p>कृषि महाविद्यालय, हिसार सीसीएसएचएयू का प्रमुख महाविद्यालय है।</p>',
      1
    ),
    (
      'college-of-agriculture-kaul',
      'College of Agriculture, Kaul',
      'कृषि महाविद्यालय, कौल',
      'Agricultural education and research at the Kaul campus in Karnal district.',
      'करनाल जिले के कौल परिसर में कृषि शिक्षा और अनुसंधान।',
      '<p>The College of Agriculture, Kaul serves farmers of eastern Haryana with teaching, research and extension activities.</p>',
      '<p>कृषि महाविद्यालय, कौल पूर्वी हरियाणा के किसानों की सेवा करता है।</p>',
      2
    )
) AS v(slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, sort_order)
WHERE p.slug = 'colleges'
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- News & notices (2)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_news (
  slug, title_en, title_hi, body_en, body_hi, notice_type, category,
  status, published_at, is_featured
) VALUES
  (
    'academic-session-2026-27-begins',
    'Academic Session 2026–27 Begins',
    'शैक्षणिक सत्र 2026–27 प्रारंभ',
    '<p>Classes for the new academic session commence from 1 August 2026. Students are advised to check the examination branch portal for timetables.</p>',
    '<p>नए शैक्षणिक सत्र की कक्षाएं 1 अगस्त 2026 से प्रारंभ होंगी।</p>',
    'notice', 'academics', 'published', now(), true
  ),
  (
    'kisan-mela-2026-registration',
    'Kisan Mela 2026 — Registration Open',
    'किसान मेला 2026 — पंजीकरण प्रारंभ',
    '<p>Registration is open for Kisan Mela 2026 at CCSHAU Hisar. Farmers and agri-entrepreneurs may register online through the university portal.</p>',
    '<p>सीसीएसएचएयू हिसार में किसान मेला 2026 के लिए पंजीकरण प्रारंभ है।</p>',
    'news', 'events', 'published', now(), false
  )
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Tenders (2)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_tenders (
  tender_number, slug, title_en, title_hi, description_en, description_hi,
  category, status, published_at, closing_date
) VALUES
  (
    'TND/HAU/2026/001',
    'supply-lab-equipment-agronomy',
    'Supply of Laboratory Equipment — Agronomy Department',
    'प्रयोगशाला उपकरण की आपूर्ति — एग्रोनॉमी विभाग',
    '<p>Sealed bids are invited for supply and installation of laboratory equipment for the Department of Agronomy.</p>',
    '<p>एग्रोनॉमी विभाग के लिए प्रयोगशाला उपकरण की आपूर्ति हेतु सीलबंद बोली आमंत्रित हैं।</p>',
    'goods', 'open', now(), now() + interval '30 days'
  ),
  (
    'TND/HAU/2026/002',
    'annual-maintenance-cctv-campus',
    'Annual Maintenance Contract — CCTV Campus Network',
    'वार्षिक रखरखाव अनुबंध — सीसीटीवी कैंपस नेटवर्क',
    '<p>Tender for comprehensive annual maintenance of CCTV and access control systems across the Hisar campus.</p>',
    '<p>हिसार परिसर में सीसीटीवी प्रणाली के वार्षिक रखरखाव हेतु निविदा।</p>',
    'services', 'open', now(), now() + interval '21 days'
  )
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Circulars (2)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_circulars (
  circular_number, title_en, title_hi, status, published_at
)
SELECT v.circular_number, v.title_en, v.title_hi, v.status, v.published_at
FROM (
  VALUES
    (
      'CIR/REG/2026/101',
      'Revised Academic Calendar 2026–27',
      'संशोधित शैक्षणिक कैलेंडर 2026–27',
      'published'::ccshau_content_status,
      now()
    ),
    (
      'CIR/EXAM/2026/045',
      'Examination Form Submission — Final Year UG',
      'परीक्षा फॉर्म जमा — स्नातक अंतिम वर्ष',
      'published'::ccshau_content_status,
      now() - interval '2 days'
    )
) AS v(circular_number, title_en, title_hi, status, published_at)
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_circulars c WHERE c.circular_number = v.circular_number
);

-- -----------------------------------------------------------------------------
-- Downloads (2) — placeholder storage paths for demo listing
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_downloads (
  title_en, title_hi, category, file_path, file_name, mime_type, status
)
SELECT v.title_en, v.title_hi, v.category, v.file_path, v.file_name, v.mime_type, v.status
FROM (
  VALUES
    (
      'Academic Calendar 2026–27 (PDF)',
      'शैक्षणिक कैलेंडर 2026–27 (PDF)',
      'academic',
      'ccshau-public/demo/academic-calendar-2026-27.pdf',
      'academic-calendar-2026-27.pdf',
      'application/pdf',
      'published'::ccshau_content_status
    ),
    (
      'RTI Information Handbook',
      'आरटीआई सूचना पुस्तिका',
      'rti',
      'ccshau-public/demo/rti-handbook.pdf',
      'rti-handbook.pdf',
      'application/pdf',
      'published'::ccshau_content_status
    )
) AS v(title_en, title_hi, category, file_path, file_name, mime_type, status)
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_downloads d WHERE d.file_path = v.file_path
);

-- -----------------------------------------------------------------------------
-- Media albums (2)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_media_albums (
  slug, title_en, title_hi, album_type, event_date, status, published_at
) VALUES
  (
    'convocation-2025',
    'Convocation 2025',
    'दीक्षांत समारोह 2025',
    'event',
    '2025-11-15',
    'published',
    now()
  ),
  (
    'kisan-mela-2025',
    'Kisan Mela 2025',
    'किसान मेला 2025',
    'photo',
    '2025-03-20',
    'published',
    now()
  )
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Related links (2)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_related_links (
  title_en, title_hi, url, category, sort_order, is_external, is_active
)
SELECT v.title_en, v.title_hi, v.url, v.category, v.sort_order, v.is_external, v.is_active
FROM (
  VALUES
    (
      'ICAR — Indian Council of Agricultural Research',
      'आईसीएआर — भारतीय कृषि अनुसंधान परिषद',
      'https://icar.org.in',
      'government',
      1,
      true,
      true
    ),
    (
      'Government of Haryana',
      'हरियाणा सरकार',
      'https://haryana.gov.in',
      'government',
      2,
      true,
      true
    )
) AS v(title_en, title_hi, url, category, sort_order, is_external, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_related_links r WHERE r.url = v.url
);

-- -----------------------------------------------------------------------------
-- Banners (2) — image_path pending until uploaded in admin; listed as inactive demo
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_banners (
  title, image_path, target_url, alt_text, priority, is_active
)
SELECT v.title, v.image_path, v.target_url, v.alt_text, v.priority, v.is_active
FROM (
  VALUES
    (
      'Welcome to CCSHAU',
      'pending',
      '/pages/about',
      'CCSHAU Hisar campus',
      10,
      false
    ),
    (
      'Admissions 2026',
      'pending',
      '/contact',
      'Admissions enquiry',
      5,
      false
    )
) AS v(title, image_path, target_url, alt_text, priority, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_banners b WHERE b.title = v.title
);


-- #############################################################################
-- Migration: 20260624150000_menus_colleges_banners.sql
-- #############################################################################

-- =============================================================================
-- Menu seed + remaining college pages + active demo banners (external image URLs)
-- Safe to re-run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Header navigation
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order)
SELECT m.id, v.label_en, v.label_hi, v.href, v.sort_order
FROM ccshau_menus m
CROSS JOIN (
  VALUES
    ('Home', 'होम', '/', 1),
    ('About', 'परिचय', '/pages/about', 2),
    ('Colleges', 'महाविद्यालय', '/pages/colleges', 3),
    ('News', 'समाचार', '/news', 4),
    ('Tenders', 'निविदाएं', '/tenders', 5),
    ('Circulars', 'परिपत्र', '/circulars', 6),
    ('Downloads', 'डाउनलोड', '/downloads', 7),
    ('Media', 'मीडिया', '/media', 8),
    ('Contact', 'संपर्क', '/contact', 9)
) AS v(label_en, label_hi, href, sort_order)
WHERE m.location = 'header'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.href = v.href AND mi.parent_id IS NULL
  );

-- -----------------------------------------------------------------------------
-- Footer links
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order)
SELECT m.id, v.label_en, v.label_hi, v.href, v.sort_order
FROM ccshau_menus m
CROSS JOIN (
  VALUES
    ('About HAU', 'एचएयू के बारे में', '/pages/about', 1),
    ('Vision & Mission', 'दृष्टि और मिशन', '/pages/vision-mission', 2),
    ('University History', 'विश्वविद्यालय का इतिहास', '/pages/history', 3),
    ('News & Notices', 'समाचार और सूचनाएं', '/news', 4),
    ('Tenders', 'निविदाएं', '/tenders', 5),
    ('Contact Us', 'संपर्क करें', '/contact', 6)
) AS v(label_en, label_hi, href, sort_order)
WHERE m.location = 'footer'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.href = v.href AND mi.parent_id IS NULL
  );

-- -----------------------------------------------------------------------------
-- Quick links (subset of common portals)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order, open_in_new_tab)
SELECT m.id, v.label_en, v.label_hi, v.href, v.sort_order, v.open_in_new_tab
FROM ccshau_menus m
CROSS JOIN (
  VALUES
    ('Online Admission', 'ऑनलाइन प्रवेश', '/contact', 1, false),
    ('e-Governance', 'ई-गवर्नेंस', 'https://hau.ac.in', 2, true),
    ('Student Corner', 'छात्र कोना', '/downloads', 3, false),
    ('e-Tendering', 'ई-निविदा', '/tenders', 4, false),
    ('NIRF', 'एनआईआरएफ', 'https://www.nirfindia.org', 5, true),
    ('RTI', 'आरटीआई', '/contact', 6, false),
    ('Digital Downloads', 'डिजिटल डाउनलोड', '/downloads', 7, false),
    ('Farmers'' Portal', 'किसान पोर्टल', '/pages/about', 8, false)
) AS v(label_en, label_hi, href, sort_order, open_in_new_tab)
WHERE m.location = 'quick_links'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.label_en = v.label_en AND mi.parent_id IS NULL
  );

-- -----------------------------------------------------------------------------
-- College child pages (7 remaining from mock)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  parent_id, status, published_at, sort_order
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  v.excerpt_en,
  v.excerpt_hi,
  v.content_en,
  v.content_hi,
  p.id,
  'published',
  now(),
  v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'college-of-agriculture-bawal',
      'College of Agriculture, Bawal',
      'कृषि महाविद्यालय, बावल',
      'Agricultural education at the Bawal campus in Rewari district.',
      'रेवाड़ी जिले के बावल परिसर में कृषि शिक्षा।',
      '<p>The College of Agriculture, Bawal extends CCSHAU teaching and research to southern Haryana.</p>',
      '<p>कृषि महाविद्यालय, बावल दक्षिणी हरियाणा में शिक्षा और अनुसंधान प्रदान करता है।</p>',
      3
    ),
    (
      'centre-food-science-technology',
      'Centre of Food Science & Technology',
      'खाद्य विज्ञान और प्रौद्योगिकी केंद्र',
      'Food processing, quality assurance and post-harvest technology programmes.',
      'खाद्य प्रसंस्करण और गुणवत्ता आश्वासन कार्यक्रम।',
      '<p>The Centre of Food Science & Technology focuses on value addition, food safety and entrepreneurial skills for the agri-food sector.</p>',
      '<p>खाद्य विज्ञान केंद्र मूल्य संवर्धन और खाद्य सुरक्षा पर केंद्रित है।</p>',
      4
    ),
    (
      'ic-college-community-science',
      'I.C. College of Community Science',
      'आई.सी. समुदाय विज्ञान महाविद्यालय',
      'Home science, nutrition and community development education.',
      'गृह विज्ञान, पोषण और सामुदायिक विकास शिक्षा।',
      '<p>I.C. College of Community Science offers programmes in family resource management, textiles and extension outreach.</p>',
      '<p>समुदाय विज्ञान महाविद्यालय गृह संसाधन प्रबंधन और विस्तार शिक्षा प्रदान करता है।</p>',
      5
    ),
    (
      'college-basic-sciences-humanities',
      'College of Basic Sciences & Humanities',
      'मूल विज्ञान और मानविकी महाविद्यालय',
      'Foundational sciences supporting agricultural and allied programmes.',
      'कृषि कार्यक्रमों के लिए मूल विज्ञान।',
      '<p>The College of Basic Sciences & Humanities delivers courses in physics, chemistry, mathematics and languages for all university students.</p>',
      '<p>मूल विज्ञान महाविद्यालय भौतिकी, रसायन और गणित में पाठ्यक्रम प्रदान करता है।</p>',
      6
    ),
    (
      'college-agricultural-engineering-technology',
      'College of Agricultural Engineering and Technology',
      'कृषि अभियांत्रिकी और प्रौद्योगिकी महाविद्यालय',
      'Farm machinery, irrigation and renewable energy engineering.',
      'कृषि मशीनरी और सिंचाई अभियांत्रिकी।',
      '<p>CAET offers B.Tech. and M.Tech. programmes in agricultural engineering with strong industry linkages.</p>',
      '<p>कृषि अभियांत्रिकी महाविद्यालय बी.टेक और एम.टेक कार्यक्रम प्रदान करता है।</p>',
      7
    ),
    (
      'college-fisheries-science',
      'College of Fisheries Science',
      'मत्स्य विज्ञान महाविद्यालय',
      'Aquaculture, fish processing and fisheries extension.',
      'मत्स्य पालन और मत्स्य प्रसंस्करण।',
      '<p>The College of Fisheries Science promotes sustainable aquaculture and livelihood opportunities for fish farmers.</p>',
      '<p>मत्स्य विज्ञान महाविद्यालय टिकाऊ मत्स्य पालन को बढ़ावा देता है।</p>',
      8
    ),
    (
      'college-biotechnology',
      'College of Biotechnology',
      'जैव प्रौद्योगिकी महाविद्यालय',
      'Plant biotechnology, genomics and molecular breeding research.',
      'पादप जैव प्रौद्योगिकी और आणविक प्रजनन।',
      '<p>The College of Biotechnology advances crop improvement through modern biotech tools and collaborative research.</p>',
      '<p>जैव प्रौद्योगिकी महाविद्यालय आधुनिक जैव प्रौद्योगिकी से फसल सुधार करता है।</p>',
      9
    )
) AS v(slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, sort_order)
WHERE p.slug = 'colleges'
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Activate demo banners with external image URLs
-- -----------------------------------------------------------------------------

UPDATE ccshau_banners
SET
  image_path = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1600&q=80',
  is_active = true,
  alt_text = 'CCSHAU Hisar campus — agricultural fields'
WHERE title = 'Welcome to CCSHAU'
  AND image_path = 'pending';

UPDATE ccshau_banners
SET
  image_path = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
  is_active = true,
  alt_text = 'Admissions 2026 — golden wheat fields'
WHERE title = 'Admissions 2026'
  AND image_path = 'pending';

INSERT INTO ccshau_banners (
  title, image_path, target_url, alt_text, priority, is_active
)
SELECT v.title, v.image_path, v.target_url, v.alt_text, v.priority, v.is_active
FROM (
  VALUES
    (
      'Welcome to CCSHAU',
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1600&q=80',
      '/pages/about',
      'CCSHAU Hisar campus — agricultural fields',
      10,
      true
    ),
    (
      'Admissions 2026',
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
      '/contact',
      'Admissions 2026 — golden wheat fields',
      5,
      true
    )
) AS v(title, image_path, target_url, alt_text, priority, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_banners b WHERE b.title = v.title
);


-- #############################################################################
-- Migration: 20260626120000_events_calendar_seed.sql
-- #############################################################################

-- =============================================================================
-- Phase 4 Sprint 5 — event calendar demo data + event portals (CMS children)
-- =============================================================================

-- Parent shell for temporary event microsites (admin: Pages → child of event-portals)
INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  status, published_at, sort_order
) VALUES (
  'event-portals',
  'Event Portals',
  'कार्यक्रम पोर्टल',
  'Organizational parent for temporary event microsites.',
  'अस्थायी कार्यक्रम माइक्रोसाइट के लिए संगठनात्मक पृष्ठ।',
  '<p>Child pages of this entry appear as event portals at <code>/portal/[slug]</code>.</p>',
  '<p>इस पृष्ठ की उप-पृष्ठें <code>/portal/[slug]</code> पर कार्यक्रम पोर्टल के रूप में दिखती हैं।</p>',
  'published',
  now(),
  100
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  parent_id, status, published_at, sort_order
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  v.excerpt_en,
  v.excerpt_hi,
  v.content_en,
  v.content_hi,
  p.id,
  'published',
  now(),
  v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'kisan-mela-2026',
      'Kisan Mela 2026',
      'किसान मेला 2026',
      'Annual farmers fair at CCSHAU Hisar — demonstrations, stalls and expert sessions.',
      'सीसीएसएचएयू हिसार में वार्षिक किसान मेला — प्रदर्शनी और विशेषज्ञ सत्र।',
      '<p><strong>Date:</strong> 28 June 2026</p><p>Welcome to the official Kisan Mela 2026 portal. Farmers can register for stall allocation, view the programme schedule and download information brochures.</p><p>Contact the Directorate of Extension Education for enquiries.</p>',
      '<p><strong>दिनांक:</strong> 28 जून 2026</p><p>किसान मेला 2026 का आधिकारिक पोर्टल। किसान स्टॉल आवंटन और कार्यक्रम अनुसूची देख सकते हैं।</p>',
      1
    )
) AS v(slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, sort_order)
WHERE p.slug = 'event-portals'
ON CONFLICT (slug) DO NOTHING;

-- Calendar-friendly media event dates (June–November 2026)
UPDATE ccshau_media_albums
SET event_date = '2026-06-28', album_type = 'event'
WHERE slug = 'kisan-mela-2025';

UPDATE ccshau_media_albums
SET event_date = '2026-11-15'
WHERE slug = 'convocation-2025';

INSERT INTO ccshau_media_albums (
  slug, title_en, title_hi, album_type, event_date, status, published_at
) VALUES (
  'youth-festival-2026',
  'Youth Festival 2026',
  'युवा उत्सव 2026',
  'event',
  '2026-07-15',
  'published',
  now()
)
ON CONFLICT (slug) DO NOTHING;

-- Header nav: Events calendar (insert before Tenders)
UPDATE ccshau_menu_items mi
SET sort_order = mi.sort_order + 1
FROM ccshau_menus m
WHERE mi.menu_id = m.id
  AND m.location = 'header'
  AND mi.sort_order >= 5
  AND mi.parent_id IS NULL;

INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order)
SELECT m.id, 'Events', 'कार्यक्रम', '/events', 5
FROM ccshau_menus m
WHERE m.location = 'header'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.href = '/events'
  );


-- #############################################################################
-- Migration: 20260627120000_college_pages_mega_menu.sql
-- #############################################################################

-- =============================================================================
-- College page type + logo image + academics mega-menu seed (safe to re-run)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE ccshau_page_type AS ENUM ('standard', 'college');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE ccshau_pages
  ADD COLUMN IF NOT EXISTS page_type ccshau_page_type NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS logo_image_path text;

COMMENT ON COLUMN ccshau_pages.page_type IS 'standard = /pages/[slug]; college = /college/[slug] landing';
COMMENT ON COLUMN ccshau_pages.logo_image_path IS 'College logo overlay on hero (college pages)';

UPDATE ccshau_pages child
SET page_type = 'college'
FROM ccshau_pages parent
WHERE child.parent_id = parent.id
  AND parent.slug = 'colleges'
  AND child.page_type = 'standard';

-- Seed academics mega-menu only when Academics top-level item is missing
INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order)
SELECT m.id, 'Academics', 'शिक्षा', '#', 3
FROM ccshau_menus m
WHERE m.location = 'header'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.label_en = 'Academics' AND mi.parent_id IS NULL
  );

INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, href, sort_order)
SELECT m.id, academics.id, v.label_en, v.label_hi, v.href, v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items academics
  ON academics.menu_id = m.id AND academics.label_en = 'Academics' AND academics.parent_id IS NULL
CROSS JOIN (
  VALUES
    ('Colleges', 'महाविद्यालय', '#', 1),
    ('Admissions', 'प्रवेश', '/contact', 2),
    ('PG Studies', 'स्नातकोत्तर अध्ययन', '/pages/about', 3),
    ('UG Studies', 'स्नातक अध्ययन', '/pages/about', 4),
    ('Scholarships & Fellowships', 'छात्रवृत्ति और फेलोशिप', '/downloads', 5)
) AS v(label_en, label_hi, href, sort_order)
WHERE m.location = 'header'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.parent_id = academics.id AND mi.label_en = v.label_en
  );

INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, colleges_item.id, p.title_en, p.title_hi, p.id, p.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items academics
  ON academics.menu_id = m.id AND academics.label_en = 'Academics' AND academics.parent_id IS NULL
JOIN ccshau_menu_items colleges_item
  ON colleges_item.parent_id = academics.id AND colleges_item.label_en = 'Colleges'
JOIN ccshau_pages parent ON parent.slug = 'colleges'
JOIN ccshau_pages p
  ON p.parent_id = parent.id AND p.page_type = 'college' AND p.status = 'published'
WHERE m.location = 'header'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi WHERE mi.menu_id = m.id AND mi.page_id = p.id
  );


-- #############################################################################
-- Migration: 20260627140000_college_demo_sections.sql
-- #############################################################################

-- =============================================================================
-- College demo — hero images, section pages (Department, Gallery), richer content
-- Safe to re-run
-- =============================================================================

-- Hero + logo images for all college landing pages
UPDATE ccshau_pages
SET
  featured_image_path = 'https://images.unsplash.com/photo-1560438154-779a4a5e3e38?auto=format&fit=crop&w=1600&q=80',
  logo_image_path = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=200&q=80',
  page_type = 'college'
WHERE slug = 'college-of-agriculture-bawal';

UPDATE ccshau_pages
SET
  featured_image_path = 'https://images.unsplash.com/photo-1574943329829-1c2d1a9b4c3b?auto=format&fit=crop&w=1600&q=80',
  logo_image_path = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=200&q=80',
  page_type = 'college'
WHERE slug = 'college-of-agriculture-hisar';

UPDATE ccshau_pages
SET
  featured_image_path = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80',
  logo_image_path = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=200&q=80',
  page_type = 'college'
WHERE slug = 'college-of-agriculture-kaul';

UPDATE ccshau_pages
SET
  featured_image_path = 'https://images.unsplash.com/photo-1503676260728-1c00da094a6b?auto=format&fit=crop&w=1600&q=80',
  page_type = 'college'
WHERE parent_id = (SELECT id FROM ccshau_pages WHERE slug = 'colleges')
  AND page_type = 'college'
  AND featured_image_path IS NULL;

-- Richer Bawal landing (matches legacy college homepage)
UPDATE ccshau_pages
SET
  excerpt_en = 'Constituent college of CCSHAU at Bawal, Rewari — undergraduate and postgraduate programmes in agriculture.',
  excerpt_hi = 'रेवाड़ी के बावल में सीसीएसएचएयू का संघटक महाविद्यालय — कृषि में स्नातक और स्नातकोत्तर कार्यक्रम।',
  content_en = '<p>The College of Agriculture, Bawal was established to extend quality agricultural education and research to the southern region of Haryana. The campus offers B.Sc. (Hons.) Agriculture and supporting diploma programmes with emphasis on crop production, soil science and extension outreach.</p><p>Students benefit from field laboratories, KVK linkages and industry exposure through the university''s research directorates.</p>',
  content_hi = '<p>कृषि महाविद्यालय, बावल दक्षिणी हरियाणा में कृषि शिक्षा और अनुसंधान के लिए स्थापित किया गया। परिसर में बी.एस.सी. (ऑनर्स) कृषि और संबंधित कार्यक्रम प्रदान किए जाते हैं।</p>'
WHERE slug = 'college-of-agriculture-bawal';

-- -----------------------------------------------------------------------------
-- Section pages under colleges (unique slugs; nav shows title_en)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  parent_id, status, published_at, sort_order, page_type
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  v.excerpt_en,
  v.excerpt_hi,
  v.content_en,
  v.content_hi,
  college.id,
  'published',
  now(),
  v.sort_order,
  'standard'
FROM ccshau_pages college
CROSS JOIN (
  VALUES
    (
      'college-of-agriculture-bawal',
      'department',
      'Department',
      'विभाग',
      'Academic departments at College of Agriculture, Bawal.',
      'बावल कृषि महाविद्यालय के शैक्षणिक विभाग।',
      '<p><strong>Departments:</strong></p><ul><li>Agronomy</li><li>Soil Science</li><li>Plant Breeding & Genetics</li><li>Entomology</li><li>Extension Education</li></ul><p>Each department offers teaching, research and extension activities aligned with CCSHAU academic regulations.</p>',
      '<p><strong>विभाग:</strong> कृषि विज्ञान, मृदा विज्ञान, पादप प्रजनन, कीट विज्ञान और विस्तार शिक्षा।</p>',
      1
    ),
    (
      'college-of-agriculture-bawal',
      'gallery',
      'Gallery',
      'गैलरी',
      'Campus photographs and events at Bawal.',
      'बावल परिसर की तस्वीरें और कार्यक्रम।',
      '<p>Photo gallery from field days, kisan melas, convocation and campus infrastructure at the Bawal college. Upload additional albums via the university Media Centre admin.</p>',
      '<p>बावल महाविद्यालय के किसान मेला, दीक्षांत और परिसर की तस्वीरें।</p>',
      2
    ),
    (
      'college-of-agriculture-hisar',
      'hisar-department',
      'Department',
      'विभाग',
      'Flagship agriculture departments at the main Hisar campus.',
      'हिसार परिसर के प्रमुख कृषि विभाग।',
      '<p>The College of Agriculture, Hisar hosts departments of Agronomy, Horticulture, Plant Pathology, Agricultural Economics and more — offering UG, PG and Ph.D. programmes.</p>',
      '<p>कृषि महाविद्यालय, हिसार में कृषि विज्ञान, बागवानी, वनस्पति रोग विज्ञान और अन्य विभाग।</p>',
      1
    ),
    (
      'college-of-agriculture-hisar',
      'hisar-gallery',
      'Gallery',
      'गैलरी',
      'Hisar campus life in pictures.',
      'हिसार परिसर की झलक।',
      '<p>Images from research farms, student activities and national seminars held at the Hisar campus.</p>',
      '<p>अनुसंधान फार्म, छात्र गतिविधियों और सेमिनार की तस्वीरें।</p>',
      2
    ),
    (
      'college-of-agriculture-kaul',
      'kaul-department',
      'Department',
      'विभाग',
      'Departments serving eastern Haryana farmers.',
      'पूर्वी हरियाणा के किसानों की सेवा करने वाले विभाग।',
      '<p>The Kaul campus departments focus on crop improvement, soil health and farmer participatory research for Karnal and adjoining districts.</p>',
      '<p>कौल परिसर के विभाग फसल सुधार और मृदा स्वास्थ्य पर केंद्रित हैं।</p>',
      1
    ),
    (
      'college-of-agriculture-kaul',
      'kaul-gallery',
      'Gallery',
      'गैलरी',
      'Kaul campus gallery.',
      'कौल परिसर गैलरी।',
      '<p>Extension activities, field demonstrations and campus facilities at College of Agriculture, Kaul.</p>',
      '<p>कौल में विस्तार गतिविधियों और प्रदर्शनों की तस्वीरें।</p>',
      2
    )
) AS v(college_slug, slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, sort_order)
WHERE college.slug = v.college_slug
  AND college.page_type = 'college'
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Administration mega-menu demo (2 levels + placeholder children)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order)
SELECT m.id, 'Administration', 'प्रशासन', '#', 2
FROM ccshau_menus m
WHERE m.location = 'header'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.label_en = 'Administration' AND mi.parent_id IS NULL
  );

INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, href, sort_order)
SELECT m.id, admin_item.id, v.label_en, v.label_hi, v.href, v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items admin_item
  ON admin_item.menu_id = m.id AND admin_item.label_en = 'Administration' AND admin_item.parent_id IS NULL
CROSS JOIN (
  VALUES
    ('Vice-Chancellor', 'कुलपति', '/pages/about', 1),
    ('Registrar', 'कुलसचिव', '/pages/about', 2),
    ('Board of Management', 'प्रबंध बोर्ड', '/pages/vision-mission', 3),
    ('Comptroller', 'नियंत्रक', '/contact', 4)
) AS v(label_en, label_hi, href, sort_order)
WHERE m.location = 'header'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.parent_id = admin_item.id AND mi.label_en = v.label_en
  );


-- #############################################################################
-- Migration: 20260627160000_main_header_menu.sql
-- #############################################################################

-- =============================================================================
-- Main header navigation — matches legacy hau.ac.in IA (user specification)
-- Replaces all header menu items on apply
-- =============================================================================

-- CMS page stubs for menu links (edit content in Admin → Pages)
INSERT INTO ccshau_pages (slug, title_en, title_hi, excerpt_en, status, published_at, sort_order)
SELECT v.slug, v.title_en, v.title_hi, v.excerpt_en, 'published', now(), v.sort_order
FROM (
  VALUES
    ('board-of-management', 'Board of management', 'प्रबंध बोर्ड', 'Board of Management, CCSHAU.', 10),
    ('vice-chancellor', 'Vice-Chancellor', 'कुलपति', 'Office of the Vice-Chancellor.', 11),
    ('registrar', 'Registrar', 'कुलसचिव', 'Office of the Registrar.', 12),
    ('comptroller', 'Comptroller', 'नियंत्रक', 'Office of the Comptroller.', 13),
    ('admissions', 'Admissions', 'प्रवेश', 'University admissions information.', 20),
    ('admissions-international-students', 'Admissions for International Students', 'अंतर्राष्ट्रीय छात्र प्रवेश', 'International student admissions.', 21),
    ('pg-studies', 'PG Studies', 'स्नातकोत्तर अध्ययन', 'Postgraduate programmes.', 22),
    ('ug-studies', 'UG Studies', 'स्नातक अध्ययन', 'Undergraduate programmes.', 23),
    ('scholarships-fellowships', 'Scholarship & Fellowships', 'छात्रवृत्ति और फेलोशिप', 'Scholarships and fellowships.', 24),
    ('university-calendar-volume-ii', 'University Calander Volume-II', 'विश्वविद्यालय कैलेंडर खंड-II', 'Academic calendar volume II.', 25),
    ('college-wise-degree-programmes', 'College wise degree programmes', 'महाविद्यालयवार डिग्री कार्यक्रम', 'Degree programmes by college.', 26),
    ('directorate-of-research', 'Directorate of Research', 'अनुसंधान निदेशालय', 'Directorate of Research.', 30),
    ('directorate-of-extension-education', 'Directorate of extension education', 'विस्तार शिक्षा निदेशालय', 'Directorate of Extension Education.', 31),
    ('human-resource-management', 'Human Resource Management', 'मानव संसाधन प्रबंधन', 'Human Resource Management.', 32),
    ('directorate-of-students-welfare', 'Directorate of Students Welfare', 'छात्र कल्याण निदेशालय', 'Directorate of Students Welfare.', 33),
    ('estate-office', 'Estate Office', 'एस्टेट कार्यालय', 'Estate Office.', 34),
    ('awards', 'Awards', 'पुरस्कार', 'University awards and honors.', 40),
    ('nehru-library', 'Nehru Library', 'नेहरू पुस्तकालय', 'Nehru Library, CCSHAU.', 41),
    ('hostel', 'Hostel', 'छात्रावास', 'University hostels.', 50),
    ('sports', 'Sports', 'खेल', 'Sports facilities and activities.', 51),
    ('hospital', 'Hospital', 'अस्पताल', 'University hospital.', 52),
    ('landscape-unit', 'Land Scap Unit', 'लैंडस्केप इकाई', 'Landscape unit.', 53),
    ('campus-school', 'Campus School', 'परिसर विद्यालय', 'Campus school.', 54),
    ('major-initiatives', 'Major Initiatives', 'प्रमुख पहल', 'Major university initiatives.', 55),
    ('international-linkage', 'International Linkage', 'अंतर्राष्ट्रीय संबद्धता', 'International collaborations.', 56)
) AS v(slug, title_en, title_hi, excerpt_en, sort_order)
ON CONFLICT (slug) DO NOTHING;

-- Replace header menu
DELETE FROM ccshau_menu_items mi
USING ccshau_menus m
WHERE mi.menu_id = m.id AND m.location = 'header';

-- Level 1
INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order)
SELECT m.id, v.label_en, v.label_hi, v.href, v.sort_order
FROM ccshau_menus m
CROSS JOIN (
  VALUES
    ('Homepage', 'होम', '/', 1),
    ('Administration', 'प्रशासन', '#', 2),
    ('Academics', 'शिक्षा', '#', 3),
    ('Directorates', 'निदेशालय', '#', 4),
    ('Awards & Honors', 'पुरस्कार और सम्मान', '#', 5),
    ('Nehru Library', 'नेहरू पुस्तकालय', '/pages/nehru-library', 6),
    ('Campus Life', 'कैंपस जीवन', '#', 7)
) AS v(label_en, label_hi, href, sort_order)
WHERE m.location = 'header';

-- Administration → level 2
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, parent.id, p.title_en, p.title_hi, p.id, v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items parent ON parent.menu_id = m.id AND parent.label_en = 'Administration' AND parent.parent_id IS NULL
CROSS JOIN (
  VALUES
    ('board-of-management', 1),
    ('vice-chancellor', 2),
    ('registrar', 3),
    ('comptroller', 4)
) AS v(page_slug, sort_order)
JOIN ccshau_pages p ON p.slug = v.page_slug
WHERE m.location = 'header';

-- Academics → Colleges (level 2 shell)
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, href, sort_order)
SELECT m.id, academics.id, 'Colleges', 'महाविद्यालय', '#', 1
FROM ccshau_menus m
JOIN ccshau_menu_items academics ON academics.menu_id = m.id AND academics.label_en = 'Academics' AND academics.parent_id IS NULL
WHERE m.location = 'header';

-- Academics → Colleges → three agriculture colleges (level 3)
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, colleges.id, p.title_en, p.title_hi, p.id, v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items academics ON academics.menu_id = m.id AND academics.label_en = 'Academics' AND academics.parent_id IS NULL
JOIN ccshau_menu_items colleges ON colleges.parent_id = academics.id AND colleges.label_en = 'Colleges'
CROSS JOIN (
  VALUES
    ('college-of-agriculture-hisar', 1),
    ('college-of-agriculture-bawal', 2),
    ('college-of-agriculture-kaul', 3)
) AS v(page_slug, sort_order)
JOIN ccshau_pages p ON p.slug = v.page_slug AND p.page_type = 'college'
WHERE m.location = 'header';

-- Academics → other level 2 items
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, academics.id, p.title_en, p.title_hi, p.id, v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items academics ON academics.menu_id = m.id AND academics.label_en = 'Academics' AND academics.parent_id IS NULL
CROSS JOIN (
  VALUES
    ('admissions', 2),
    ('admissions-international-students', 3),
    ('pg-studies', 4),
    ('ug-studies', 5),
    ('scholarships-fellowships', 6),
    ('university-calendar-volume-ii', 7),
    ('college-wise-degree-programmes', 8)
) AS v(page_slug, sort_order)
JOIN ccshau_pages p ON p.slug = v.page_slug
WHERE m.location = 'header';

-- Directorates → Research / Extension shells (level 2)
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, href, sort_order)
SELECT m.id, directorates.id, v.label_en, v.label_hi, '#', v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items directorates ON directorates.menu_id = m.id AND directorates.label_en = 'Directorates' AND directorates.parent_id IS NULL
CROSS JOIN (
  VALUES
    ('Research', 'अनुसंधान', 1),
    ('Extension', 'विस्तार', 2)
) AS v(label_en, label_hi, sort_order)
WHERE m.location = 'header';

-- Directorates → Research → Directorate of Research (level 3)
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, research.id, p.title_en, p.title_hi, p.id, 1
FROM ccshau_menus m
JOIN ccshau_menu_items directorates ON directorates.menu_id = m.id AND directorates.label_en = 'Directorates' AND directorates.parent_id IS NULL
JOIN ccshau_menu_items research ON research.parent_id = directorates.id AND research.label_en = 'Research'
JOIN ccshau_pages p ON p.slug = 'directorate-of-research'
WHERE m.location = 'header';

-- Directorates → Extension → Directorate of Extension Education (level 3)
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, extension.id, p.title_en, p.title_hi, p.id, 1
FROM ccshau_menus m
JOIN ccshau_menu_items directorates ON directorates.menu_id = m.id AND directorates.label_en = 'Directorates' AND directorates.parent_id IS NULL
JOIN ccshau_menu_items extension ON extension.parent_id = directorates.id AND extension.label_en = 'Extension'
JOIN ccshau_pages p ON p.slug = 'directorate-of-extension-education'
WHERE m.location = 'header';

-- Directorates → direct level 2 links
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, directorates.id, p.title_en, p.title_hi, p.id, v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items directorates ON directorates.menu_id = m.id AND directorates.label_en = 'Directorates' AND directorates.parent_id IS NULL
CROSS JOIN (
  VALUES
    ('human-resource-management', 3),
    ('directorate-of-students-welfare', 4),
    ('estate-office', 5)
) AS v(page_slug, sort_order)
JOIN ccshau_pages p ON p.slug = v.page_slug
WHERE m.location = 'header';

-- Awards & Honors → Awards
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, awards.id, p.title_en, p.title_hi, p.id, 1
FROM ccshau_menus m
JOIN ccshau_menu_items awards ON awards.menu_id = m.id AND awards.label_en = 'Awards & Honors' AND awards.parent_id IS NULL
JOIN ccshau_pages p ON p.slug = 'awards'
WHERE m.location = 'header';

-- Campus Life → level 2
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, campus.id, p.title_en, p.title_hi, p.id, v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items campus ON campus.menu_id = m.id AND campus.label_en = 'Campus Life' AND campus.parent_id IS NULL
CROSS JOIN (
  VALUES
    ('hostel', 1),
    ('sports', 2),
    ('hospital', 3),
    ('landscape-unit', 4),
    ('campus-school', 5),
    ('major-initiatives', 6),
    ('international-linkage', 7)
) AS v(page_slug, sort_order)
JOIN ccshau_pages p ON p.slug = v.page_slug
WHERE m.location = 'header';

-- Nehru Library top-level: link via page_id for consistency
UPDATE ccshau_menu_items mi
SET page_id = p.id, href = NULL
FROM ccshau_menus m, ccshau_pages p
WHERE mi.menu_id = m.id AND m.location = 'header'
  AND mi.label_en = 'Nehru Library' AND mi.parent_id IS NULL
  AND p.slug = 'nehru-library';


-- #############################################################################
-- Migration: 20260627170000_menu_label_legacy_casing.sql
-- #############################################################################

-- Align menu/page labels with legacy hau.ac.in casing (user spec)

UPDATE ccshau_pages
SET title_en = 'Board of management'
WHERE slug = 'board-of-management';

UPDATE ccshau_pages
SET title_en = 'Directorate of extension education'
WHERE slug = 'directorate-of-extension-education';

-- Keep menu labels in sync with linked CMS pages
UPDATE ccshau_menu_items mi
SET label_en = p.title_en
FROM ccshau_pages p
WHERE mi.page_id = p.id
  AND mi.label_en IS DISTINCT FROM p.title_en;


-- #############################################################################
-- Migration: 20260630210000_homepage_legacy_colleges.sql
-- #############################################################################

-- Align college slugs and logos with legacy hau.ac.in homepage (Education At University)

UPDATE ccshau_pages child
SET
  slug = v.new_slug,
  logo_image_path = v.logo_url
FROM ccshau_pages parent
CROSS JOIN (
  VALUES
    (
      'centre-food-science-technology',
      'centre-of-food-science-technology',
      'https://hau.ac.in/public/images/college/logo/8/1547026866.jpg'
    ),
    (
      'ic-college-community-science',
      'ic-college-of-home-science',
      'https://hau.ac.in/public/images/college/logo/9/1741857160.jpg'
    ),
    (
      'college-agricultural-engineering-technology',
      'college-of-agricultural-engineering-and-technology',
      'https://hau.ac.in/public/images/college/logo/11/1538048892.png'
    ),
    (
      'college-fisheries-science',
      'college-of-fisheries-science',
      'https://hau.ac.in/public/images/college/logo/65/1716002752.png'
    ),
    (
      'college-biotechnology',
      'college-of-biotechnology',
      'https://hau.ac.in/public/images/college/logo/67/1782193277.jpg'
    )
) AS v(old_slug, new_slug, logo_url)
WHERE child.parent_id = parent.id
  AND parent.slug = 'colleges'
  AND child.slug = v.old_slug
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_pages existing WHERE existing.slug = v.new_slug AND existing.id <> child.id
  );

UPDATE ccshau_pages child
SET logo_image_path = v.logo_url
FROM ccshau_pages parent
CROSS JOIN (
  VALUES
    ('college-of-agriculture-hisar', 'https://hau.ac.in/public/images/college/logo/2/1540803791.jpg'),
    ('college-of-agriculture-kaul', 'https://hau.ac.in/public/images/college/logo/6/1540803865.jpg'),
    ('college-of-agriculture-bawal', 'https://hau.ac.in/public/images/college/logo/7/1552737173.jpg'),
    ('centre-of-food-science-technology', 'https://hau.ac.in/public/images/college/logo/8/1547026866.jpg'),
    ('ic-college-of-home-science', 'https://hau.ac.in/public/images/college/logo/9/1741857160.jpg'),
    ('college-of-basic-sciences-humanities', 'https://hau.ac.in/public/images/college/logo/10/1540803999.jpg'),
    (
      'college-of-agricultural-engineering-and-technology',
      'https://hau.ac.in/public/images/college/logo/11/1538048892.png'
    ),
    ('college-of-fisheries-science', 'https://hau.ac.in/public/images/college/logo/65/1716002752.png'),
    ('college-of-biotechnology', 'https://hau.ac.in/public/images/college/logo/67/1782193277.jpg')
) AS v(slug, logo_url)
WHERE child.parent_id = parent.id
  AND parent.slug = 'colleges'
  AND child.slug = v.slug
  AND (child.logo_image_path IS NULL OR child.logo_image_path = 'pending');


-- #############################################################################
-- Migration: 20260630300000_homepage_cms.sql
-- #############################################################################

-- Homepage CMS — quotes, dignitaries, flagships (initiatives), farmers portal CTA

CREATE TABLE IF NOT EXISTS ccshau_homepage_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_en text NOT NULL,
  author_hi text,
  quote_en text NOT NULL,
  quote_hi text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ccshau_homepage_dignitaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_hi text,
  role_en text NOT NULL,
  role_hi text,
  image_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ccshau_homepage_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_hi text,
  description_en text NOT NULL,
  description_hi text,
  image_path text NOT NULL,
  link_slug text,
  link_href text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ccshau_homepage_cta (
  id integer PRIMARY KEY DEFAULT 1,
  title_en text NOT NULL,
  title_hi text,
  subtitle_en text,
  subtitle_hi text,
  button_en text NOT NULL DEFAULT 'Click Here',
  button_hi text,
  link_href text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ccshau_homepage_cta_singleton CHECK (id = 1)
);

COMMENT ON TABLE ccshau_homepage_quotes IS 'CCSHAU_ rotating quotes on homepage';
COMMENT ON TABLE ccshau_homepage_dignitaries IS 'CCSHAU_ dignitaries carousel on homepage';
COMMENT ON TABLE ccshau_homepage_initiatives IS 'CCSHAU_ flagships / initiatives carousel on homepage';
COMMENT ON TABLE ccshau_homepage_cta IS 'CCSHAU_ farmers portal CTA band on homepage';

CREATE TRIGGER ccshau_trg_homepage_quotes_updated_at
  BEFORE UPDATE ON ccshau_homepage_quotes
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TRIGGER ccshau_trg_homepage_dignitaries_updated_at
  BEFORE UPDATE ON ccshau_homepage_dignitaries
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TRIGGER ccshau_trg_homepage_initiatives_updated_at
  BEFORE UPDATE ON ccshau_homepage_initiatives
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TRIGGER ccshau_trg_homepage_cta_updated_at
  BEFORE UPDATE ON ccshau_homepage_cta
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_homepage_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_homepage_dignitaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_homepage_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_homepage_cta ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_homepage_quotes_select_active
  ON ccshau_homepage_quotes FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY ccshau_pol_homepage_dignitaries_select_active
  ON ccshau_homepage_dignitaries FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY ccshau_pol_homepage_initiatives_select_active
  ON ccshau_homepage_initiatives FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY ccshau_pol_homepage_cta_select_active
  ON ccshau_homepage_cta FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY ccshau_pol_homepage_quotes_select_authenticated
  ON ccshau_homepage_quotes FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_homepage_dignitaries_select_authenticated
  ON ccshau_homepage_dignitaries FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_homepage_initiatives_select_authenticated
  ON ccshau_homepage_initiatives FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_homepage_cta_select_authenticated
  ON ccshau_homepage_cta FOR SELECT TO authenticated USING (true);

-- Seed from legacy hau.ac.in homepage (safe to re-run)

INSERT INTO ccshau_homepage_quotes (author_en, author_hi, quote_en, quote_hi, sort_order)
SELECT v.author_en, v.author_hi, v.quote_en, v.quote_hi, v.sort_order
FROM (
  VALUES
    (
      'Chaudhary Charan Singh',
      'चौधरी चरण सिंह',
      'The prosperity of the nation passes through the fields and barns of villages.',
      'देश की समृद्धि का रास्ता गांवों के खेतों एवं खलिहानों से होकर गुजरता है।',
      1
    ),
    (
      'Norman Borlaug',
      'नॉर्मन बोरलॉग',
      'The first essential component of social justice is adequate food for all mankind.',
      'सामाजिक न्याय का पहला आवश्यक घटक सभी मानव जाति के लिए पर्याप्त भोजन है।',
      2
    ),
    (
      'Dr. M. S. Swaminathan',
      'डॉ. एम. एस. स्वामीनाथन',
      'If farm ecology and economics go wrong, nothing else will go right in agriculture.',
      'अगर फार्म इकोलॉजी और इकोनॉमिक्स गलत हो जाते हैं, तो कृषि में कुछ भी सही नहीं होगा।',
      3
    )
) AS v(author_en, author_hi, quote_en, quote_hi, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM ccshau_homepage_quotes LIMIT 1);

INSERT INTO ccshau_homepage_dignitaries (name_en, name_hi, role_en, role_hi, image_path, sort_order)
SELECT v.name_en, v.name_hi, v.role_en, v.role_hi, v.image_path, v.sort_order
FROM (
  VALUES
    (
      'Droupadi Murmu',
      'द्रौपदी मुर्मू',
      'Hon''ble President of India',
      'भारत की माननीय राष्ट्रपति',
      'https://hau.ac.in/public/images/speakers/5/1662633138.jpg',
      1
    ),
    (
      'Narendra Modi',
      'नरेंद्र मोदी',
      'Hon''ble Prime Minister of India',
      'भारत के माननीय प्रधानमंत्री',
      'https://hau.ac.in/public/images/speakers/4/1662633149.jpg',
      2
    ),
    (
      'Prof. Ashim Kumar Ghosh',
      'प्रो. अशिम कुमार घोष',
      'Hon''ble Governor of Haryana',
      'हरियाणा के माननीय राज्यपाल',
      'https://hau.ac.in/public/images/speakers/3/1767765134.jpg',
      3
    ),
    (
      'Nayab Singh Saini',
      'नायब सिंह सैनी',
      'Hon''ble Chief Minister of Haryana',
      'हरियाणा के माननीय मुख्यमंत्री',
      'https://hau.ac.in/public/images/speakers/2/1722239329.jpeg',
      4
    )
) AS v(name_en, name_hi, role_en, role_hi, image_path, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM ccshau_homepage_dignitaries LIMIT 1);

INSERT INTO ccshau_homepage_initiatives (
  title_en, title_hi, description_en, description_hi, image_path, link_slug, sort_order
)
SELECT v.title_en, v.title_hi, v.description_en, v.description_hi, v.image_path, v.link_slug, v.sort_order
FROM (
  VALUES
    (
      'Agribusiness Incubation Centre',
      'कृषि व्यवसाय इनक्यूबेशन केंद्र',
      'Agriculture is the primary sector of our economy and majority of the population is directly or indirectly dependent on it.',
      'कृषि हमारी अर्थव्यवस्था का प्राथमिक क्षेत्र है और अधिकांश जनसंख्या प्रत्यक्ष या अप्रत्यक्ष रूप से इस पर निर्भर है।',
      'https://hau.ac.in/public/images/college/banner/68/1689051816.JPG',
      'agribusiness-incubation-centre',
      1
    ),
    (
      'Centre for Bio-Nanotechnology',
      'जैव-नैनो प्रौद्योगिकी केंद्र',
      'Centre for Bio-Nanotechnology was established at CCS HAU to advance research at the intersection of biology and nanotechnology.',
      'जैव-नैनो प्रौद्योगिकी केंद्र सीसीएसएचएयू में जीव विज्ञान और नैनो प्रौद्योगिकी पर अनुसंधान के लिए स्थापित किया गया।',
      'https://hau.ac.in/public/images/college/banner/66/1581499566.jpg',
      'centre-for-bio-nanotechnology',
      2
    ),
    (
      'RKVY-RAFTAAR Agribusiness Incubator',
      'आरकेवीवाई-रफ्तार कृषि व्यवसाय इनक्यूबेटर',
      'Agriculture is the primary sector of our economy and majority of the population is directly or indirectly dependent on it.',
      'कृषि हमारी अर्थव्यवस्था का प्राथमिक क्षेत्र है और अधिकांश जनसंख्या प्रत्यक्ष या अप्रत्यक्ष रूप से इस पर निर्भर है।',
      'https://hau.ac.in/public/images/college/banner/64/1555063867.JPG',
      'rkvy-raftaar-agribusiness-incubator-under-rkvy-raftaar-scheme',
      3
    ),
    (
      'Institutional Development Plan',
      'संस्थागत विकास योजना',
      'Since its founding in 1970, CCS HAU has pursued excellence in teaching, research and extension.',
      '1970 में स्थापना के बाद से सीसीएसएचएयू शिक्षा, अनुसंधान और विस्तार में उत्कृष्टता के लिए कार्यरत है।',
      'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg',
      'institutional-development-plan-idp',
      4
    ),
    (
      'Skill Council of India',
      'स्किल काउंसिल ऑफ इंडिया',
      'Extension education is a major function of CCS HAU — vocational training and outreach across Haryana.',
      'विस्तार शिक्षा सीसीएसएचएयू का प्रमुख कार्य है — हरियाणा भर में व्यावसायिक प्रशिक्षण और जन-जागरूकता।',
      'https://hau.ac.in/public/images/college/banner/43/1731475495.png',
      'skill-council-of-india',
      5
    )
) AS v(title_en, title_hi, description_en, description_hi, image_path, link_slug, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM ccshau_homepage_initiatives LIMIT 1);

INSERT INTO ccshau_homepage_cta (
  id, title_en, title_hi, subtitle_en, subtitle_hi, button_en, button_hi, link_href
)
VALUES (
  1,
  'Farmers'' Portal',
  'किसान पोर्टल',
  'Crop advisories, extension services and farmer-focused resources from CCSHAU Hisar',
  'सीसीएसएचएयू हिसार से फसल सलाह, विस्तार सेवाएं और किसान-केंद्रित संसाधन',
  'Click Here',
  'यहाँ क्लिक करें',
  '/pages/about'
)
ON CONFLICT (id) DO NOTHING;


-- #############################################################################
-- Migration: 20260701120000_office_portal_template.sql
-- #############################################################################

-- Office portal layout for administrative college pages (e.g. Registrar Office)

DO $$ BEGIN
  CREATE TYPE ccshau_layout_template AS ENUM ('college_home', 'office_portal', 'standard');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE ccshau_pages
  ADD COLUMN IF NOT EXISTS layout_template ccshau_layout_template NOT NULL DEFAULT 'college_home',
  ADD COLUMN IF NOT EXISTS head_name_en text,
  ADD COLUMN IF NOT EXISTS head_name_hi text,
  ADD COLUMN IF NOT EXISTS head_role_en text,
  ADD COLUMN IF NOT EXISTS head_role_hi text,
  ADD COLUMN IF NOT EXISTS head_image_path text,
  ADD COLUMN IF NOT EXISTS office_cta_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN ccshau_pages.layout_template IS 'Public layout: college_home, office_portal (sidebar office), standard';
COMMENT ON COLUMN ccshau_pages.head_name_en IS 'Office portal — head officer name (EN)';
COMMENT ON COLUMN ccshau_pages.head_role_en IS 'Office portal — head officer role/titles (EN); separate lines with newline';
COMMENT ON COLUMN ccshau_pages.office_cta_enabled IS 'Office portal — show farmers portal CTA band';

CREATE TABLE IF NOT EXISTS ccshau_page_contact_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  label_en text NOT NULL,
  label_hi text,
  value_en text NOT NULL,
  value_hi text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ccshau_page_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_hi text,
  designation_en text NOT NULL,
  designation_hi text,
  specialization_en text,
  specialization_hi text,
  image_path text,
  detail_href text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ccshau_page_sidebar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('left', 'right')),
  label_en text NOT NULL,
  label_hi text,
  href text,
  linked_page_id uuid REFERENCES ccshau_pages (id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_page_contact_lines IS 'CCSHAU_ structured contact block on office portal pages';
COMMENT ON TABLE ccshau_page_staff IS 'CCSHAU_ staff directory rows on office portal pages';
COMMENT ON TABLE ccshau_page_sidebar_items IS 'CCSHAU_ per-page left/right quick link sidebars';

CREATE INDEX IF NOT EXISTS ccshau_idx_page_contact_lines_page
  ON ccshau_page_contact_lines (page_id, sort_order);
CREATE INDEX IF NOT EXISTS ccshau_idx_page_staff_page
  ON ccshau_page_staff (page_id, sort_order);
CREATE INDEX IF NOT EXISTS ccshau_idx_page_sidebar_items_page
  ON ccshau_page_sidebar_items (page_id, side, sort_order);

CREATE TRIGGER ccshau_trg_page_contact_lines_updated_at
  BEFORE UPDATE ON ccshau_page_contact_lines
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TRIGGER ccshau_trg_page_staff_updated_at
  BEFORE UPDATE ON ccshau_page_staff
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TRIGGER ccshau_trg_page_sidebar_items_updated_at
  BEFORE UPDATE ON ccshau_page_sidebar_items
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_page_contact_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_page_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_page_sidebar_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_page_contact_lines_select_active
  ON ccshau_page_contact_lines FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM ccshau_pages p
      WHERE p.id = page_id AND p.status = 'published'
    )
  );

CREATE POLICY ccshau_pol_page_staff_select_active
  ON ccshau_page_staff FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM ccshau_pages p
      WHERE p.id = page_id AND p.status = 'published'
    )
  );

CREATE POLICY ccshau_pol_page_sidebar_items_select_active
  ON ccshau_page_sidebar_items FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM ccshau_pages p
      WHERE p.id = page_id AND p.status = 'published'
    )
  );

CREATE POLICY ccshau_pol_page_contact_lines_select_authenticated
  ON ccshau_page_contact_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_page_staff_select_authenticated
  ON ccshau_page_staff FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_page_sidebar_items_select_authenticated
  ON ccshau_page_sidebar_items FOR SELECT TO authenticated USING (true);

-- Registrar Office (legacy https://hau.ac.in/college/registrar-office)

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi,
  page_type, layout_template, status, published_at,
  head_name_en, head_name_hi, head_role_en, head_role_hi, head_image_path,
  featured_image_path, office_cta_enabled
)
VALUES (
  'registrar-office',
  'Registrar Office',
  'कुलसचिव कार्यालय',
  'Registrar Office of CCS Haryana Agricultural University, Hisar.',
  'चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार का कुलसचिव कार्यालय।',
  'college',
  'office_portal',
  'published',
  now(),
  'Dr. Pawan Kumar',
  'डॉ. पवन कुमार',
  E'Registrar' || E'\n' || 'Chief Vigilance Officer',
  E'कुलसचिव' || E'\n' || 'मुख्य सतर्कता अधिकारी',
  'https://hau.ac.in/storage/app/uploads/qMTteJ1Y5WaYgqNs1InqlrKemUdJtMbX0jSszoLD.jpeg',
  'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  title_en = EXCLUDED.title_en,
  title_hi = EXCLUDED.title_hi,
  page_type = 'college',
  layout_template = 'office_portal',
  status = 'published',
  head_name_en = EXCLUDED.head_name_en,
  head_name_hi = EXCLUDED.head_name_hi,
  head_role_en = EXCLUDED.head_role_en,
  head_role_hi = EXCLUDED.head_role_hi,
  head_image_path = EXCLUDED.head_image_path,
  featured_image_path = EXCLUDED.featured_image_path,
  office_cta_enabled = true;

INSERT INTO ccshau_page_contact_lines (page_id, label_en, label_hi, value_en, value_hi, sort_order)
SELECT p.id, v.label_en, v.label_hi, v.value_en, v.value_hi, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'Query Regarding Admission',
      'प्रवेश संबंधी पूछताछ',
      'Office : +91 1662 255271, 255254',
      'कार्यालय : +91 1662 255271, 255254',
      1
    ),
    (
      'Query Regarding Recruitment',
      'भर्ती संबंधी पूछताछ',
      'Office : +91 1662 255224, 255154',
      'कार्यालय : +91 1662 255224, 255154',
      2
    ),
    (
      'Office',
      'कार्यालय',
      'Office : +91 1662 234613, +91 1662 255284, +91 1662 255294',
      'कार्यालय : +91 1662 234613, +91 1662 255284, +91 1662 255294',
      3
    ),
    ('Fax', 'फैक्स', 'Fax : +91 1662 284358', 'फैक्स : +91 1662 284358', 4),
    ('E-mail', 'ई-मेल', 'E-mail : regi@hau.ac.in', 'ई-मेल : regi@hau.ac.in', 5)
) AS v(label_en, label_hi, value_en, value_hi, sort_order)
WHERE p.slug = 'registrar-office'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_page_contact_lines c WHERE c.page_id = p.id LIMIT 1
  );

INSERT INTO ccshau_page_sidebar_items (page_id, side, label_en, label_hi, href, sort_order)
SELECT p.id, v.side, v.label_en, v.label_hi, v.href, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    ('left', 'Home', 'होम', '/college/registrar-office', 1),
    ('left', 'Academic Branch', 'शैक्षणिक शाखा', '/college/registrar-office/academic-branch', 2),
    ('left', 'Controller of Examination', 'परीक्षा नियंत्रक', '/college/registrar-office/controller-of-examination', 3),
    ('left', 'Establishment/Employees Branch', 'स्थापना/कर्मचारी शाखा', '/college/registrar-office/establishment-employees-branch', 4),
    ('left', 'Faculty Branch', 'संकाय शाखा', '/college/registrar-office/faculty-branch', 5),
    ('left', 'General Branch', 'सामान्य शाखा', '/college/registrar-office/general-branch', 6),
    ('left', 'Legal Cell', 'कानूनी प्रकोष्ठ', '/college/registrar-office/legal-cell', 7),
    ('left', 'Recruitment Branch', 'भर्ती शाखा', '/college/registrar-office/recruitment-branch', 8),
    ('right', 'University Home', 'विश्वविद्यालय होम', '/', 1),
    ('right', 'Contact Us', 'संपर्क करें', '/contact', 2),
    ('right', 'Tenders', 'निविदाएं', '/tenders', 3),
    ('right', 'Downloads', 'डाउनलोड', '/downloads', 4)
) AS v(side, label_en, label_hi, href, sort_order)
WHERE p.slug = 'registrar-office'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_page_sidebar_items s WHERE s.page_id = p.id LIMIT 1
  );

-- Branch child pages (placeholders — admin can enrich content)
INSERT INTO ccshau_pages (
  slug, title_en, title_hi, parent_id, page_type, layout_template, status, published_at, office_cta_enabled
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  parent.id,
  'college',
  'office_portal',
  'published',
  now(),
  true
FROM ccshau_pages parent
CROSS JOIN (
  VALUES
    ('academic-branch', 'Academic Branch', 'शैक्षणिक शाखा'),
    ('controller-of-examination', 'Controller of Examination', 'परीक्षा नियंत्रक'),
    ('establishment-employees-branch', 'Establishment/Employees Branch', 'स्थापना/कर्मचारी शाखा'),
    ('faculty-branch', 'Faculty Branch', 'संकाय शाखा'),
    ('general-branch', 'General Branch', 'सामान्य शाखा'),
    ('legal-cell', 'Legal Cell', 'कानूनी प्रकोष्ठ'),
    ('recruitment-branch', 'Recruitment Branch', 'भर्ती शाखा')
) AS v(slug, title_en, title_hi)
WHERE parent.slug = 'registrar-office'
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  page_type = 'college',
  layout_template = 'office_portal',
  status = 'published',
  office_cta_enabled = true;

-- Copy sidebar quick links to branch pages (inherit same left menu)
INSERT INTO ccshau_page_sidebar_items (page_id, side, label_en, label_hi, href, sort_order)
SELECT child.id, s.side, s.label_en, s.label_hi, s.href, s.sort_order
FROM ccshau_pages parent
JOIN ccshau_pages child ON child.parent_id = parent.id
JOIN ccshau_page_sidebar_items s ON s.page_id = parent.id
WHERE parent.slug = 'registrar-office'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_page_sidebar_items x WHERE x.page_id = child.id LIMIT 1
  );


-- #############################################################################
-- Migration: 20260702120000_sidebar_item_content.sql
-- #############################################################################

-- Sidebar quick links: optional inline content when no URL is set

ALTER TABLE ccshau_page_sidebar_items
  ADD COLUMN IF NOT EXISTS content_en text,
  ADD COLUMN IF NOT EXISTS content_hi text;

COMMENT ON COLUMN ccshau_page_sidebar_items.content_en IS 'Inline HTML content shown in main area when href is empty';
COMMENT ON COLUMN ccshau_page_sidebar_items.content_hi IS 'Hindi inline HTML content when href is empty';


-- #############################################################################
-- Migration: 20260703120000_layout_config.sql
-- #############################################################################

-- Per-page layout section toggles (unified college / office portal layout)

ALTER TABLE ccshau_pages
  ADD COLUMN IF NOT EXISTS layout_config jsonb;

COMMENT ON COLUMN ccshau_pages.layout_config IS 'Section visibility toggles: hero, headOfficer, contacts, staff, sidebars, etc.';

-- Registrar Office — office portal preset
UPDATE ccshau_pages
SET layout_config = jsonb_build_object(
  'hero', true,
  'headOfficer', true,
  'contacts', true,
  'staff', true,
  'mainContent', true,
  'leftSidebar', true,
  'rightSidebar', true,
  'collegeTopMenu', false,
  'farmersCta', true,
  'heroContactButton', false
)
WHERE slug = 'registrar-office'
  AND (layout_config IS NULL OR layout_config = '{}'::jsonb);

-- College of Agriculture, Hisar — college home preset
UPDATE ccshau_pages
SET layout_config = jsonb_build_object(
  'hero', true,
  'headOfficer', true,
  'contacts', true,
  'staff', false,
  'mainContent', true,
  'leftSidebar', false,
  'rightSidebar', false,
  'collegeTopMenu', true,
  'farmersCta', false,
  'heroContactButton', true
)
WHERE slug = 'college-of-agriculture-hisar'
  AND (layout_config IS NULL OR layout_config = '{}'::jsonb);

-- Other college home pages
UPDATE ccshau_pages
SET layout_config = jsonb_build_object(
  'hero', true,
  'headOfficer', false,
  'contacts', false,
  'staff', false,
  'mainContent', true,
  'leftSidebar', false,
  'rightSidebar', false,
  'collegeTopMenu', true,
  'farmersCta', false,
  'heroContactButton', true
)
WHERE page_type = 'college'
  AND layout_template = 'college_home'
  AND (layout_config IS NULL OR layout_config = '{}'::jsonb);

-- Office portal branch pages — inherit sidebars, minimal hero on sections
UPDATE ccshau_pages
SET layout_config = jsonb_build_object(
  'hero', false,
  'headOfficer', false,
  'contacts', false,
  'staff', false,
  'mainContent', true,
  'leftSidebar', true,
  'rightSidebar', true,
  'collegeTopMenu', false,
  'farmersCta', false,
  'heroContactButton', false
)
WHERE layout_template = 'office_portal'
  AND parent_id IS NOT NULL
  AND (layout_config IS NULL OR layout_config = '{}'::jsonb);


-- #############################################################################
-- Migration: 20260703140000_college_of_agriculture_hisar_content.sql
-- #############################################################################

-- =============================================================================
-- College of Agriculture, Hisar — bilingual about page content (legacy hau.ac.in)
-- =============================================================================

UPDATE ccshau_pages
SET
  head_name_en = 'Dr. Ramesh Kumar Goyal',
  head_name_hi = 'डॉ. रमेश कुमार गोयल',
  head_role_en = 'Professor and Dean',
  head_role_hi = 'प्राध्यापक एवं डीन',
  head_image_path = 'https://hau.ac.in/storage/app/uploads/college-user/lx5W3WSwssNlucNJqrqXDduHuZdhMaN4oeqm068W.png',
  logo_image_path = 'https://hau.ac.in/public/images/college/logo/2/1540803791.jpg',
  layout_config = jsonb_build_object(
    'hero', false,
    'headOfficer', true,
    'contacts', true,
    'staff', false,
    'leftSidebar', false,
    'rightSidebar', false,
    'mainContent', true,
    'farmersCta', false,
    'collegeTopMenu', true,
    'heroContactButton', false
  ),
  content_en = $en$
<h2>About College Of Agriculture, Hisar</h2>
<p>The College of Agriculture at Hisar came into existence on July 17, 1962 as Government Agriculture College. The College was initially affiliated to Punjab University, Chandigarh. It became the integral part of Haryana Agricultural University, Hisar with its creation in February 2, 1970. The college of agriculture, a citadel of agricultural education, research and extension, is one of the most important and largest constituent colleges of CCS Haryana Agricultural University. The college continuously caters into the needs of agricultural research and education of the students and stakeholders from the state as well as from other states and countries.</p>
<p>The College of Agriculture, Hisar is proud of its upgraded facilities, which include modern classrooms, well-equipped departmental libraries, laboratories, seminar rooms, examination hall and student farms. College is having well qualified and experienced faculty. College has 14 departments covering every aspect of agriculture education as per ICAR guidelines,</p>
<p>The central facilities of the university allow the college to produce brilliant graduates and postgraduates who are well prepared for the future endeavours in the field of contemporary agriculture. The college gives equal importance on co-curricular activities, such as cultural, sports, NCC and NSS, in addition to curricular ones, as these activities help students grow into better human beings. Through these activities, students' general growth, interpersonal skills and sense of patriotism are fostered.</p>
<p>The best theoretical and practical education is given to the students with the assistance of highly educated instructors. The unique exposure to practical and classroom education, followed by a year of practical crop production and six months of Rural Agriculture Work Experience (RAWE) helps to develop future-ready agriculture graduates in a variety of agricultural disciplines. To develop the students' entrepreneurial skills and prepare them for future ventures into production and marketing, a special focus is placed on agro-based skill-oriented activities such as organic farming, sustainable agriculture, beekeeping, mushroom cultivation, vermi-composting, dairying and horticulture. The college promotes and supports international exposure to its students. Additionally, the college is effective at educating students from other nations.</p>
<p>These congenial conditions of the college equip students for the future, enabling them to achieve academically and better serve the farming community, as seen by the majority of gold medals won by students at this college as well as representation our students at national and international level. This graduates of the college are serving universities, banks, armed forces, cooperative sector and other public and private sectors successfully.</p>
<h3>OBJECTIVES</h3>
<p>The College adopts the following goals and objectives which permeate in offering of various curricula and undertakes research and extension activities by its departments to:</p>
<ul>
<li>Provide world-class education to our students.</li>
<li>Maintain a strong basic and applied research programme to support all segments of agriculture and allied sectors through enhanced agricultural productivity and environmental sustainability.</li>
<li>Serve the rural society through extension activities by disseminating research-based knowledge.</li>
<li>Assist stakeholders through value-added endeavours, bio-based products, bio-processing, crop diversification etc.</li>
<li>Monitor climate change impacts on agricultural systems and develop mitigation strategies adopting interdisciplinary approaches.</li>
</ul>
<p><a href="https://www.hau.ac.in/storage/app/uploads/CIpDwZYmgUxyqkDffAvhyvTJviSaMzOvQIQjRwdH.pdf" target="_blank" rel="noopener noreferrer">Under Graduate Course Catalogue</a></p>
$en$,
  content_hi = $hi$
<h2>हिसार कृषि महाविद्यालय के बारे में</h2>
<p>हिसार में कृषि महाविद्यालय की स्थापना 17 जुलाई, 1962 को सरकारी कृषि महाविद्यालय के रूप में हुई थी। महाविद्यालय प्रारंभ में पंजाब विश्वविद्यालय, चंडीगढ़ से संबद्ध था। 2 फरवरी, 1970 को हरियाणा कृषि विश्वविद्यालय, हिसार की स्थापना के साथ यह उसका अभिन्न अंग बन गया। कृषि महाविद्यालय, कृषि शिक्षा, अनुसंधान और विस्तार का एक केंद्र है, जो चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय के सबसे महत्वपूर्ण और बड़े घटक महाविद्यालयों में से एक है। यह महाविद्यालय राज्य के साथ-साथ अन्य राज्यों और देशों के छात्रों और हितधारकों की कृषि अनुसंधान और शिक्षा की आवश्यकताओं की निरंतर पूर्ति करता है।</p>
<p>हिसार का कृषि महाविद्यालय अपनी उन्नत सुविधाओं पर गर्व करता है, जिनमें आधुनिक कक्षाएं, सुसज्जित विभागीय पुस्तकालय, प्रयोगशालाएं, सेमिनार कक्ष, परीक्षा हॉल और छात्र खेत शामिल हैं। महाविद्यालय में सुयोग्य और अनुभवी संकाय है। महाविद्यालय में आईसीएआर दिशानिर्देशों के अनुसार कृषि शिक्षा के प्रत्येक पहलू को कवर करने वाले 14 विभाग हैं।</p>
<p>विश्वविद्यालय की केंद्रीय सुविधाएं महाविद्यालय को उत्कृष्ट स्नातक और स्नातकोत्तर तैयार करने में सक्षम बनाती हैं, जो समकालीन कृषि के क्षेत्र में भविष्य के प्रयासों के लिए पूरी तरह तैयार हैं। महाविद्यालय पाठ्यक्रम के अतिरिक्त सह-पाठ्यचर्या गतिविधियों जैसे सांस्कृतिक, खेल, एनसीसी और एनएसएस को भी समान महत्व देता है, क्योंकि ये गतिविधियां छात्रों को बेहतर मानव बनने में मदद करती हैं। इन गतिविधियों के माध्यम से छात्रों के समग्र विकास, पारस्परिक कौशल और देशभक्ति की भावना को बढ़ावा मिलता है।</p>
<p>अत्यधिक शिक्षित प्रशिक्षकों की सहायता से छात्रों को सर्वोत्तम सैद्धांतिक और व्यावहारिक शिक्षा प्रदान की जाती है। व्यावहारिक और कक्षा शिक्षा के अनूठे अनुभव के बाद एक वर्ष की व्यावहारिक फसल उत्पादन और छह माह की ग्रामीण कृषि कार्य अनुभव (RAWE) विभिन्न कृषि विषयों में भविष्य के लिए तैयार कृषि स्नातकों के विकास में सहायक है। छात्रों के उद्यमी कौशल विकसित करने और उत्पादन और विपणन में भविष्य के उद्यमों के लिए उन्हें तैयार करने हेतु जैविक खेती, सतत कृषि, मधुमक्खी पालन, मशरूम उत्पादन, वर्मी-कम्पोस्टिंग, डेयरी और बागवानी जैसी कृषि आधारित कौशल-उन्मुखी गतिविधियों पर विशेष ध्यान दिया जाता है। महाविद्यालय अपने छात्रों को अंतर्राष्ट्रीय अनुभव प्रदान करने और समर्थन करने के लिए प्रोत्साहित करता है। इसके अतिरिक्त, महाविद्यालय अन्य देशों के छात्रों को प्रभावी ढंग से शिक्षित करने में सक्षम है।</p>
<p>महाविद्यालय की अनुकूल परिस्थितियां छात्रों को भविष्य के लिए सुसज्जित करती हैं, जिससे वे शैक्षणिक रूप से उत्कृष्ट प्रदर्शन कर सकें और कृषक समुदाय की बेहतर सेवा कर सकें, जैसा कि इस महाविद्यालय के छात्रों द्वारा जीते गए अधिकांश स्वर्ण पदकों तथा राष्ट्रीय और अंतर्राष्ट्रीय स्तर पर हमारे छात्रों की भागीदारी से स्पष्ट है। इस महाविद्यालय के स्नातक विश्वविद्यालयों, बैंकों, सशस्त्र बलों, सहकारी क्षेत्र और अन्य सार्वजनिक एवं निजी क्षेत्रों में सफलतापूर्वक सेवा कर रहे हैं।</p>
<h3>उद्देश्य</h3>
<p>महाविद्यालय निम्नलिखित लक्ष्यों और उद्देश्यों को अपनाता है, जो विभिन्न पाठ्यक्रमों की पेशकश में व्याप्त हैं और जिनके लिए इसके विभाग अनुसंधान और विस्तार गतिविधियां संपादित करते हैं:</p>
<ul>
<li>हमारे छात्रों को विश्व स्तरीय शिक्षा प्रदान करना।</li>
<li>कृषि उत्पादकता और पर्यावरणीय स्थिरता में वृद्धि के माध्यम से कृषि और संबद्ध क्षेत्रों के सभी खंडों का समर्थन करने हेतु एक मजबूत मूलभूत और अनुप्रयुक्त अनुसंधान कार्यक्रम बनाए रखना।</li>
<li>अनुसंधान आधारित ज्ञान के प्रसार के माध्यम से विस्तार गतिविधियों द्वारा ग्रामीण समाज की सेवा करना।</li>
<li>मूल्य संवर्धित प्रयासों, जैव आधारित उत्पादों, जैव प्रसंस्करण, फसल विविधीकरण आदि के माध्यम से हितधारकों की सहायता करना।</li>
<li>कृषि प्रणालियों पर जलवायु परिवर्तन के प्रभावों की निगरानी करना और अंतःविषयक दृष्टिकोण अपनाते हुए शमन रणनीतियों का विकास करना।</li>
</ul>
<p><a href="https://www.hau.ac.in/storage/app/uploads/CIpDwZYmgUxyqkDffAvhyvTJviSaMzOvQIQjRwdH.pdf" target="_blank" rel="noopener noreferrer">स्नातक पाठ्यक्रम सूची</a></p>
$hi$
WHERE slug = 'college-of-agriculture-hisar';

DELETE FROM ccshau_page_contact_lines
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'college-of-agriculture-hisar');

INSERT INTO ccshau_page_contact_lines (page_id, label_en, label_hi, value_en, value_hi, sort_order)
SELECT p.id, v.label_en, v.label_hi, v.value_en, v.value_hi, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'Mailing Address',
      'डाक पता',
      'College of Agriculture CCS Haryana Agricultural University Hisar - 125004, (Haryana) India',
      'कृषि महाविद्यालय, चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय हिसार - 125004, (हरियाणा) भारत',
      1
    ),
    (
      'Office',
      'कार्यालय',
      'Office : +91 01662255401, +91 9416397529',
      'कार्यालय : +91 01662255401, +91 9416397529',
      2
    ),
    (
      'Email Id',
      'ई-मेल आईडी',
      'dcoag@hau.ac.in',
      'dcoag@hau.ac.in',
      3
    )
) AS v(label_en, label_hi, value_en, value_hi, sort_order)
WHERE p.slug = 'college-of-agriculture-hisar';


-- #############################################################################
-- Migration: 20260703150000_college_contact_emails.sql
-- #############################################################################

-- Add secondary email for College of Agriculture, Hisar contact page
UPDATE ccshau_page_contact_lines
SET
  value_en = 'dcoag@hau.ac.in, dcoaghau@gmail.com',
  value_hi = 'dcoag@hau.ac.in, dcoaghau@gmail.com'
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'college-of-agriculture-hisar')
  AND label_en = 'Email Id';


-- #############################################################################
-- Migration: 20260703160000_agricultural_economics_faculty.sql
-- #############################################################################

-- Agricultural Economics (Hisar) — faculty migrated from legacy hau.ac.in department API
-- Source: https://www.hau.ac.in/department-faculty/teaching_staff/2/1

UPDATE ccshau_pages
SET
  layout_template = 'office_portal',
  layout_config = jsonb_build_object(
    'hero', true,
    'headOfficer', false,
    'contacts', false,
    'staff', true,
    'leftSidebar', true,
    'rightSidebar', false,
    'mainContent', true,
    'farmersCta', false,
    'collegeTopMenu', true,
    'heroContactButton', false
  )
WHERE slug = 'agricultural-economics-hisar';

UPDATE ccshau_page_sidebar_items
SET
  label_hi = 'संकाय',
  content_en = NULL,
  content_hi = NULL
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'agricultural-economics-hisar')
  AND label_en = 'Faculty';

DELETE FROM ccshau_page_staff
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'agricultural-economics-hisar');

INSERT INTO ccshau_page_staff (
  page_id, name_en, name_hi, designation_en, designation_hi,
  specialization_en, specialization_hi, image_path, sort_order
)
SELECT p.id, v.name_en, v.name_hi, v.designation_en, v.designation_hi,
       v.specialization_en, v.specialization_hi, v.image_path, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'Dr. DharmPal Malik',
      'डॉ. धर्म पाल मलिक',
      'Professor and Head',
      'प्राध्यापक एवं विभागाध्यक्ष',
      'Farm Management, Agriculture Finance, Agricultural Marketing & Price Analysis',
      'फार्म प्रबंधन, कृषि वित्त, कृषि विपणन एवं मूल्य विश्लेषण',
      'https://www.hau.ac.in/storage/app/uploads/college-user/ngRi8KD7UmPXkGFtlxQMiS1rNoUblq5nfA8vFjyo.png',
      1
    ),
    (
      'Dr. Sanjay Kumar',
      'डॉ. संजय कुमार',
      'Assoc. Professor',
      'सहायक प्राध्यापक',
      'Farm Management',
      'फार्म प्रबंधन',
      'https://www.hau.ac.in/storage/app/uploads/college-user/g4szECjOChfmSLgNCWKbhobCT8MA8SDbPBWEs1mN.jpeg',
      2
    ),
    (
      'Dr. Vinay Mehala',
      'डॉ. विनय मेहला',
      'Asstt. Scientist',
      'सहायक वैज्ञानिक',
      'Agricultural Marketing & Farm Management',
      'कृषि विपणन एवं फार्म प्रबंधन',
      'https://www.hau.ac.in/storage/app/uploads/college-user/zbHBIWATWZWqrmAi2pfPZA540RXn4M8jUctq8Okv.jpeg',
      3
    ),
    (
      'Dr. Sumit',
      'डॉ. सुमित',
      'Assistant Scientist (Agril. Economics)',
      'सहायक वैज्ञानिक (कृषि अर्थशास्त्र)',
      'Farm Management and Production Economics',
      'फार्म प्रबंधन एवं उत्पादन अर्थशास्त्र',
      'https://www.hau.ac.in/storage/app/uploads/college-user/YDvROz8x6tY9173V2HfjJ7iUER48INLBFMKUldjs.jpeg',
      4
    ),
    (
      'Dr. Monika Devi',
      'डॉ. मोनिका देवी',
      'Assistant Scientist (Statistics)',
      'सहायक वैज्ञानिक (सांख्यिकी)',
      'Sample Surveys, Statistical Modelling',
      'नमूना सर्वेक्षण, सांख्यिकीय मॉडलिंग',
      'https://www.hau.ac.in/storage/app/uploads/college-user/lucqGBtZ3tCUiUim90DrAzkfSqSSURaF6FkVfK3G.png',
      5
    ),
    (
      'Dr. Neeraj Pawar',
      'डॉ. नीरज पवार',
      'Assistant Scientist',
      'सहायक वैज्ञानिक',
      'Agricultural Marketing',
      'कृषि विपणन',
      'https://www.hau.ac.in/storage/app/uploads/college-user/3pJmp4MzRNIYfR59yW26DkyYhiv9yv9zgwm3gdmQ.jpeg',
      6
    ),
    (
      'Dr. Janailin S. Papang',
      'डॉ. जनैलिन एस. पापांग',
      'Assistant Professor',
      'सहायक प्राध्यापक',
      'Production economics and agricultural marketing',
      'उत्पादन अर्थशास्त्र एवं कृषि विपणन',
      'https://www.hau.ac.in/storage/app/uploads/college-user/lBLWrx2lLkjXFpMr7ayhAy6Nro7I8C4U1gGwyR7X.png',
      7
    ),
    (
      'Dr. Rijul Sihag',
      'डॉ. रिजुल सिहाग',
      'Assistant Scientist (Rural Sociology)',
      'सहायक वैज्ञानिक (ग्रामीण समाजशास्त्र)',
      'Sociology, socio-economic development',
      'समाजशास्त्र, सामाजिक-आर्थिक विकास',
      'https://www.hau.ac.in/storage/app/uploads/college-user/1kSiYTnbNQzyJ1ncTghaOLROCaFhiSf7ILfF5R9d.jpeg',
      8
    ),
    (
      'Dr. Sanjay',
      'डॉ. संजय',
      'Assistant Professor',
      'सहायक प्राध्यापक',
      'Agricultural Finance',
      'कृषि वित्त',
      'https://www.hau.ac.in/storage/app/uploads/college-user/Dnx5ylEDEA9dcyFzRcBZbxkADcaRsWXnPzQs7vOC.jpeg',
      9
    )
) AS v(
  name_en, name_hi, designation_en, designation_hi,
  specialization_en, specialization_hi, image_path, sort_order
)
WHERE p.slug = 'agricultural-economics-hisar';


-- #############################################################################
-- Migration: 20260703170000_hisar_gallery.sql
-- #############################################################################

-- College page gallery items (legacy hau.ac.in college gallery albums)
-- Source: https://www.hau.ac.in/college/gallery/college-of-agriculture-hisar (album 95)

CREATE TABLE IF NOT EXISTS ccshau_page_gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  image_url text NOT NULL,
  thumbnail_url text,
  title_en text,
  title_hi text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_page_gallery_items IS 'CCSHAU_ image gallery items for college section pages';

CREATE INDEX IF NOT EXISTS ccshau_idx_page_gallery_items_page
  ON ccshau_page_gallery_items (page_id, sort_order);

CREATE TRIGGER ccshau_trg_page_gallery_items_updated_at
  BEFORE UPDATE ON ccshau_page_gallery_items
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_page_gallery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ccshau_pol_page_gallery_items_select_active ON ccshau_page_gallery_items;
CREATE POLICY ccshau_pol_page_gallery_items_select_active
  ON ccshau_page_gallery_items FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM ccshau_pages p
      WHERE p.id = page_id AND p.status = 'published'
    )
  );

DROP POLICY IF EXISTS ccshau_pol_page_gallery_items_select_authenticated ON ccshau_page_gallery_items;
CREATE POLICY ccshau_pol_page_gallery_items_select_authenticated
  ON ccshau_page_gallery_items FOR SELECT TO authenticated USING (true);

UPDATE ccshau_pages
SET
  title_hi = 'गैलरी',
  excerpt_en = 'Photo gallery from College of Agriculture, Hisar.',
  excerpt_hi = 'हिसार कृषि महाविद्यालय की फोटो गैलरी।',
  content_en = NULL,
  layout_config = jsonb_build_object(
    'hero', false,
    'headOfficer', false,
    'contacts', false,
    'staff', false,
    'gallery', true,
    'leftSidebar', false,
    'rightSidebar', false,
    'mainContent', false,
    'farmersCta', false,
    'collegeTopMenu', true,
    'heroContactButton', false
  )
WHERE slug = 'hisar-gallery';

DELETE FROM ccshau_page_gallery_items
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'hisar-gallery');

INSERT INTO ccshau_page_gallery_items (
  page_id, image_url, thumbnail_url, title_en, title_hi, sort_order
)
SELECT p.id, v.image_url, v.thumbnail_url, v.title_en, v.title_hi, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    ('https://www.hau.ac.in/public/images/gallery/images/1664/16867154740.jpg', 'https://www.hau.ac.in/public/images/gallery/images/1664/16867154740_thumb.jpg', 'Images', 'छवियाँ', 1),
    ('https://www.hau.ac.in/public/images/gallery/images/1665/16867154930.JPG', 'https://www.hau.ac.in/public/images/gallery/images/1665/16867154930_thumb.JPG', 'Images', 'छवियाँ', 2),
    ('https://www.hau.ac.in/public/images/gallery/images/1666/16867155080.JPG', 'https://www.hau.ac.in/public/images/gallery/images/1666/16867155080_thumb.JPG', 'Images', 'छवियाँ', 3),
    ('https://www.hau.ac.in/public/images/gallery/images/1667/16867155210.JPG', 'https://www.hau.ac.in/public/images/gallery/images/1667/16867155210_thumb.JPG', 'Images', 'छवियाँ', 4),
    ('https://www.hau.ac.in/public/images/gallery/images/1668/16867155340.jpg', 'https://www.hau.ac.in/public/images/gallery/images/1668/16867155340_thumb.jpg', 'Images', 'छवियाँ', 5),
    ('https://www.hau.ac.in/public/images/gallery/images/1669/16867155490.jpg', 'https://www.hau.ac.in/public/images/gallery/images/1669/16867155490_thumb.jpg', 'Images', 'छवियाँ', 6),
    ('https://www.hau.ac.in/public/images/gallery/images/1670/16868007910.jpg', 'https://www.hau.ac.in/public/images/gallery/images/1670/16868007910_thumb.jpg', 'Images', 'छवियाँ', 7),
    ('https://www.hau.ac.in/public/images/gallery/images/2198/17156656820.jpeg', 'https://www.hau.ac.in/public/images/gallery/images/2198/17156656820_thumb.jpeg', 'Images', 'छवियाँ', 8),
    ('https://www.hau.ac.in/public/images/gallery/images/2199/17156656980.jpeg', 'https://www.hau.ac.in/public/images/gallery/images/2199/17156656980_thumb.jpeg', 'Images', 'छवियाँ', 9),
    ('https://www.hau.ac.in/public/images/gallery/images/2200/17156657110.jpeg', 'https://www.hau.ac.in/public/images/gallery/images/2200/17156657110_thumb.jpeg', 'Images', 'छवियाँ', 10),
    ('https://www.hau.ac.in/public/images/gallery/images/2201/17156657250.jpeg', 'https://www.hau.ac.in/public/images/gallery/images/2201/17156657250_thumb.jpeg', 'Images', 'छवियाँ', 11),
    ('https://www.hau.ac.in/public/images/gallery/images/2202/17156657480.jpeg', 'https://www.hau.ac.in/public/images/gallery/images/2202/17156657480_thumb.jpeg', 'Images', 'छवियाँ', 12),
    ('https://www.hau.ac.in/public/images/gallery/images/2203/17156657860.jpeg', 'https://www.hau.ac.in/public/images/gallery/images/2203/17156657860_thumb.jpeg', 'Images', 'छवियाँ', 13)
) AS v(image_url, thumbnail_url, title_en, title_hi, sort_order)
WHERE p.slug = 'hisar-gallery';


-- #############################################################################
-- Migration: 20260706100000_google_translate_vault_secret.sql
-- #############################################################################

-- Server-only helper to read named secrets from Supabase Vault.
-- Used by Next.js admin translation (service role RPC).

CREATE OR REPLACE FUNCTION ccshau_get_vault_secret(p_name text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret::text
  INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = p_name
  LIMIT 1;

  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION ccshau_get_vault_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ccshau_get_vault_secret(text) TO service_role;

COMMENT ON FUNCTION ccshau_get_vault_secret(text) IS
  'Returns a decrypted Vault secret by name. Callable only with service role.';


-- #############################################################################
-- Migration: 20260706110000_college_rbac.sql
-- #############################################################################

-- College-scoped RBAC: one user manages one college; pages tagged with college_root_id.

DO $$ BEGIN
  CREATE TYPE ccshau_college_scope_role AS ENUM ('college_admin', 'college_editor', 'college_viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ccshau_user_colleges (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  college_page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  role ccshau_college_scope_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_user_colleges IS 'Maps each CMS user to exactly one college microsite (one row per user).';

CREATE INDEX IF NOT EXISTS ccshau_idx_user_colleges_college_page_id
  ON ccshau_user_colleges (college_page_id);

CREATE TRIGGER ccshau_trg_user_colleges_updated_at
  BEFORE UPDATE ON ccshau_user_colleges
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_pages
  ADD COLUMN IF NOT EXISTS college_root_id uuid REFERENCES ccshau_pages (id) ON DELETE SET NULL;

COMMENT ON COLUMN ccshau_pages.college_root_id IS 'Root college page id for microsite scoping (self for college home, inherited for child pages).';

CREATE INDEX IF NOT EXISTS ccshau_idx_pages_college_root_id
  ON ccshau_pages (college_root_id);

CREATE OR REPLACE FUNCTION ccshau_resolve_college_root_id(p_page_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_page ccshau_pages%ROWTYPE;
  v_parent ccshau_pages%ROWTYPE;
  v_grandparent ccshau_pages%ROWTYPE;
BEGIN
  SELECT * INTO v_page FROM ccshau_pages WHERE id = p_page_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_page.college_root_id IS NOT NULL THEN
    RETURN v_page.college_root_id;
  END IF;

  IF v_page.page_type = 'college' AND v_page.parent_id IS NOT NULL THEN
    SELECT * INTO v_parent FROM ccshau_pages WHERE id = v_page.parent_id;
    IF FOUND AND v_parent.slug = 'colleges' THEN
      RETURN v_page.id;
    END IF;
  END IF;

  IF v_page.page_type = 'college' AND v_page.parent_id IS NULL THEN
    RETURN v_page.id;
  END IF;

  IF v_page.parent_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_parent FROM ccshau_pages WHERE id = v_page.parent_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_parent.page_type = 'college' THEN
    RETURN v_parent.id;
  END IF;

  IF v_parent.parent_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_grandparent FROM ccshau_pages WHERE id = v_parent.parent_id;
  IF FOUND AND v_grandparent.page_type = 'college' THEN
    RETURN v_grandparent.id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION ccshau_set_page_college_root_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_root uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.page_type = 'college' AND NEW.parent_id IS NOT NULL THEN
      SELECT id INTO v_root FROM ccshau_pages WHERE id = NEW.parent_id AND slug = 'colleges';
      IF FOUND THEN
        NEW.college_root_id := NEW.id;
        RETURN NEW;
      END IF;
    END IF;

    IF NEW.parent_id IS NOT NULL THEN
      SELECT college_root_id INTO v_root FROM ccshau_pages WHERE id = NEW.parent_id;
      IF v_root IS NOT NULL THEN
        NEW.college_root_id := v_root;
        RETURN NEW;
      END IF;

      SELECT p.college_root_id INTO v_root
      FROM ccshau_pages child
      JOIN ccshau_pages p ON p.id = child.parent_id
      WHERE child.id = NEW.parent_id AND p.page_type = 'college';

      IF v_root IS NOT NULL THEN
        NEW.college_root_id := v_root;
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  v_root := ccshau_resolve_college_root_id(NEW.id);
  IF v_root IS NOT NULL THEN
    NEW.college_root_id := v_root;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ccshau_trg_pages_college_root_id ON ccshau_pages;
CREATE TRIGGER ccshau_trg_pages_college_root_id
  BEFORE INSERT OR UPDATE OF parent_id, page_type ON ccshau_pages
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_page_college_root_id();

-- Backfill existing college microsite pages.
UPDATE ccshau_pages child
SET college_root_id = college.id
FROM ccshau_pages college
WHERE college.page_type = 'college'
  AND child.parent_id = college.id
  AND child.college_root_id IS NULL;

UPDATE ccshau_pages grandchild
SET college_root_id = college.id
FROM ccshau_pages section
JOIN ccshau_pages college ON college.id = section.parent_id AND college.page_type = 'college'
WHERE grandchild.parent_id = section.id
  AND grandchild.college_root_id IS NULL;

UPDATE ccshau_pages college
SET college_root_id = college.id
WHERE college.page_type = 'college'
  AND college.college_root_id IS NULL
  AND EXISTS (
    SELECT 1 FROM ccshau_pages parent
    WHERE parent.id = college.parent_id AND parent.slug = 'colleges'
  );

ALTER TABLE ccshau_user_colleges ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_user_colleges_select_authenticated
  ON ccshau_user_colleges FOR SELECT TO authenticated
  USING (true);


-- #############################################################################
-- Migration: 20260706120000_coaet_college_migration.sql
-- #############################################################################

-- =============================================================================
-- COAET (College of Agricultural Engineering and Technology) — full microsite migration
-- Legacy: https://hau.ac.in/college/college-of-agricultural-engineering-and-technology
-- =============================================================================

-- -----------------------------------------------------------------------------
-- College home — bilingual about, dean, layout, branding
-- -----------------------------------------------------------------------------

UPDATE ccshau_pages
SET
  page_type = 'college',
  layout_template = 'college_home',
  title_hi = 'कृषि अभियांत्रिकी और प्रौद्योगिकी महाविद्यालय',
  excerpt_en = 'B.Tech. and M.Tech. programmes in agricultural engineering at the CCSHAU Hisar campus.',
  excerpt_hi = 'सीसीएसएचएयू हिसार परिसर में कृषि अभियांत्रिकी के बी.टेक. और एम.टेक. कार्यक्रम।',
  featured_image_path = COALESCE(
    featured_image_path,
    'https://hau.ac.in/public/images/college/banner/11/1538048893.jpg'
  ),
  logo_image_path = COALESCE(
    logo_image_path,
    'https://hau.ac.in/public/images/college/logo/11/1538048892.png'
  ),
  head_name_en = 'Dr. Ajay Kumar Vashisht',
  head_name_hi = 'डॉ. अजय कुमार वशिष्ठ',
  head_role_en = 'Dean',
  head_role_hi = 'डीन',
  layout_config = jsonb_build_object(
    'hero', false,
    'headOfficer', true,
    'contacts', true,
    'staff', false,
    'gallery', false,
    'mainContent', true,
    'leftSidebar', false,
    'rightSidebar', false,
    'collegeTopMenu', true,
    'farmersCta', false,
    'heroContactButton', false
  ),
  content_en = $en$
<h2>About College Of Agricultural Engineering And Technology</h2>
<p>The College of Agricultural Engineering and Technology (COAE&amp;T) is located in the main campus of CCS Haryana Agricultural University at Hisar, 170 km from Delhi on National Highway No. 10, 2 km from the Railway Station and 3 km from the Bus Stand Hisar. The undergraduate programme of B. Tech. (Agricultural Engineering) was approved in 1987 and admissions began in August 1987. The College of Agricultural Engineering and Technology was established after approval in 1992 and inaugurated on 21st August, 1992.</p>
<p>Subsequently, departments of Farm Power &amp; Machinery and Soil &amp; Water Engineering were established in 1993 and the College started awarding Master of Technology (Agril. Engg.) in the above departments. The department of Agricultural Processing &amp; Energy was created in August 1996. The section of Basic Engineering was created in October 1996. The annual intake for the undergraduate programme increased gradually from 20 to 54 students in 2010. In 2013-14, seats were reduced from 54 to 35 for B. Tech. admission to increase personal attention and practical training. Ph.D. was started in all three departments in 2016. Two new departments — Renewable and Bio-energy Engineering and Basic Engineering — were established in 2017.</p>
<h3>Mandate / Objectives of the College</h3>
<ul>
<li>Nurturing scholarly education in different branches of study in the discipline of Agricultural Engineering</li>
<li>Advancement of learning and pursuit of research in the discipline of Agricultural Engineering</li>
<li>Undertaking extension by transferring well-proven technology for the benefit of the farming community</li>
</ul>
<h3>Academic Programs</h3>
<ol>
<li>Graduate program leading to B.Tech. (Ag. Engg.) — duration 4 years.</li>
<li>Post graduate programs leading to M.Tech. and Ph.D. in Farm Machinery &amp; Power Engg., Soil and Water Engg. and Processing and Food Engg.</li>
</ol>
$en$,
  content_hi = $hi$
<h2>कृषि अभियांत्रिकी और प्रौद्योगिकी महाविद्यालय के बारे में</h2>
<p>कृषि अभियांत्रिकी और प्रौद्योगिकी महाविद्यालय (सीओएईएंडटी) चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय के मुख्य परिसर हिसार में स्थित है। बी. टेक. (कृषि अभियांत्रिकी) स्नातक कार्यक्रम 1987 में स्वीकृत हुआ और 1992 में महाविद्यालय की स्थापना की गई।</p>
<h3>महाविद्यालय के उद्देश्य</h3>
<ul>
<li>कृषि अभियांत्रिकी के विभिन्न शाखाओं में शैक्षणिक शिक्षा का संवर्धन</li>
<li>अनुसंधान में सीखने की उन्नति</li>
<li>किसान समुदाय के लाभ हेतु प्रमाणित तकनीक का विस्तार</li>
</ul>
$hi$,
  status = 'published',
  published_at = COALESCE(published_at, now())
WHERE slug = 'college-of-agricultural-engineering-and-technology';

DELETE FROM ccshau_page_contact_lines
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'college-of-agricultural-engineering-and-technology');

INSERT INTO ccshau_page_contact_lines (page_id, label_en, label_hi, value_en, value_hi, sort_order)
SELECT p.id, v.label_en, v.label_hi, v.value_en, v.value_hi, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'Mailing Address',
      'डाक पता',
      'College of Agricultural Engineering & Technology CCS Haryana Agricultural University Hisar - 125004 Haryana (India)',
      'कृषि अभियांत्रिकी एवं प्रौद्योगिकी महाविद्यालय, चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय हिसार - 125004 (हरियाणा) भारत',
      1
    ),
    (
      'Office',
      'कार्यालय',
      'Office : 01662-255206',
      'कार्यालय : 01662-255206',
      2
    ),
    (
      'Email Id',
      'ई-मेल आईडी',
      'dcoaeg@hau.ac.in',
      'dcoaeg@hau.ac.in',
      3
    )
) AS v(label_en, label_hi, value_en, value_hi, sort_order)
WHERE p.slug = 'college-of-agricultural-engineering-and-technology';

-- -----------------------------------------------------------------------------
-- Section pages: Department + Gallery
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  parent_id, page_type, layout_template, layout_config, status, published_at, sort_order
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  v.excerpt_en,
  v.excerpt_hi,
  v.content_en,
  v.content_hi,
  college.id,
  'standard',
  v.layout_template,
  v.layout_config,
  'published',
  now(),
  v.sort_order
FROM ccshau_pages college
CROSS JOIN (
  VALUES
    (
      'coaet-department',
      'Department',
      'विभाग',
      'Engineering departments at College of Agricultural Engineering and Technology.',
      'कृषि अभियांत्रिकी महाविद्यालय के अभियांत्रिकी विभाग।',
      '<p><strong>Departments:</strong></p><ul><li>Basic Engineering</li><li>Farm Machinery &amp; Power Engineering</li><li>Instrumentation Cell</li><li>Processing and Food Engineering</li><li>Renewable and Bio-energy Engineering</li><li>Soil &amp; Water Engineering</li></ul>',
      '<p><strong>विभाग:</strong> मूल अभियांत्रिकी, कृषि मशीनरी, प्रसंस्करण, नवीकरणीय ऊर्जा और मृदा एवं जल अभियांत्रिकी।</p>',
      'standard',
      NULL::jsonb,
      1
    ),
    (
      'coaet-gallery',
      'Gallery',
      'गैलरी',
      'Photo gallery from College of Agricultural Engineering and Technology.',
      'कृषि अभियांत्रिकी महाविद्यालय की फोटो गैलरी।',
      NULL,
      NULL,
      'standard',
      jsonb_build_object(
        'hero', false,
        'headOfficer', false,
        'contacts', false,
        'staff', false,
        'gallery', true,
        'mainContent', false,
        'leftSidebar', false,
        'rightSidebar', false,
        'collegeTopMenu', true,
        'farmersCta', false,
        'heroContactButton', false
      ),
      2
    )
) AS v(slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, layout_template, layout_config, sort_order)
WHERE college.slug = 'college-of-agricultural-engineering-and-technology'
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  title_en = EXCLUDED.title_en,
  title_hi = EXCLUDED.title_hi,
  excerpt_en = EXCLUDED.excerpt_en,
  excerpt_hi = EXCLUDED.excerpt_hi,
  content_en = EXCLUDED.content_en,
  content_hi = EXCLUDED.content_hi,
  layout_template = EXCLUDED.layout_template,
  layout_config = EXCLUDED.layout_config,
  status = 'published',
  published_at = COALESCE(ccshau_pages.published_at, now());

-- -----------------------------------------------------------------------------
-- Department subsections (office portal layout)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, parent_id, page_type, layout_template, layout_config,
  status, published_at, sort_order, office_cta_enabled
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  v.excerpt_en,
  dept_section.id,
  'standard',
  'office_portal',
  jsonb_build_object(
    'hero', true,
    'headOfficer', false,
    'contacts', false,
    'staff', true,
    'gallery', false,
    'mainContent', true,
    'leftSidebar', true,
    'rightSidebar', false,
    'collegeTopMenu', true,
    'farmersCta', false,
    'heroContactButton', false
  ),
  'published',
  now(),
  v.sort_order,
  true
FROM ccshau_pages dept_section
CROSS JOIN (
  VALUES
    ('coaet-basic-engineering', 'Basic Engineering', 'मूल अभियांत्रिकी', 'Basic Engineering department at COAET.', 1),
    ('coaet-farm-machinery-power-engineering', 'Farm Machinery & Power Engineering', 'कृषि मशीनरी एवं शक्ति अभियांत्रिकी', 'Farm Machinery & Power Engineering department at COAET.', 2),
    ('coaet-instrumentation-cell', 'Instrumentation Cell', 'इंस्ट्रूमेंटेशन सेल', 'Instrumentation Cell at COAET.', 3),
    ('coaet-processing-food-engineering', 'Processing and Food Engineering', 'प्रसंस्करण एवं खाद्य अभियांत्रिकी', 'Processing and Food Engineering department at COAET.', 4),
    ('coaet-renewable-bio-energy-engineering', 'Renewable and Bio-energy Engineering', 'नवीकरणीय एवं जैव-ऊर्जा अभियांत्रिकी', 'Renewable and Bio-energy Engineering department at COAET.', 5),
    ('coaet-soil-water-engineering', 'Soil & Water Engineering', 'मृदा एवं जल अभियांत्रिकी', 'Soil & Water Engineering department at COAET.', 6)
) AS v(slug, title_en, title_hi, excerpt_en, sort_order)
WHERE dept_section.slug = 'coaet-department'
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  layout_template = 'office_portal',
  layout_config = EXCLUDED.layout_config,
  status = 'published';

-- Sidebar tabs for each department subsection
INSERT INTO ccshau_page_sidebar_items (page_id, side, label_en, label_hi, content_en, sort_order, is_active)
SELECT p.id, 'left', 'About', 'परिचय',
       '<p>' || p.title_en || ' at College of Agricultural Engineering and Technology, CCS HAU Hisar.</p>',
       1, true
FROM ccshau_pages p
WHERE p.slug LIKE 'coaet-%'
  AND p.slug NOT IN ('coaet-department', 'coaet-gallery')
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_page_sidebar_items s
    WHERE s.page_id = p.id AND s.label_en = 'About'
  );

INSERT INTO ccshau_page_sidebar_items (page_id, side, label_en, label_hi, sort_order, is_active)
SELECT p.id, 'left', 'Faculty', 'संकाय', 2, true
FROM ccshau_pages p
WHERE p.slug LIKE 'coaet-%'
  AND p.slug NOT IN ('coaet-department', 'coaet-gallery')
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_page_sidebar_items s
    WHERE s.page_id = p.id AND s.label_en = 'Faculty'
  );

-- -----------------------------------------------------------------------------
-- Gallery images (legacy hau.ac.in college gallery)
-- -----------------------------------------------------------------------------

DELETE FROM ccshau_page_gallery_items
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'coaet-gallery');

INSERT INTO ccshau_page_gallery_items (
  page_id, image_url, thumbnail_url, title_en, title_hi, sort_order
)
SELECT p.id, v.image_url, v.thumbnail_url, v.title_en, v.title_hi, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    ('https://www.hau.ac.in/public/images/gallery/15/1545216772.jpg', 'https://www.hau.ac.in/public/images/gallery/15/1545216772.jpg', 'Campus', 'परिसर', 1),
    ('https://www.hau.ac.in/public/images/gallery/16/1545216761.jpg', 'https://www.hau.ac.in/public/images/gallery/16/1545216761.jpg', 'Campus', 'परिसर', 2),
    ('https://hau.ac.in/public/images/college/banner/11/1538048893.jpg', 'https://hau.ac.in/public/images/college/banner/11/1538048893.jpg', 'College banner', 'महाविद्यालय बैनर', 3)
) AS v(image_url, thumbnail_url, title_en, title_hi, sort_order)
WHERE p.slug = 'coaet-gallery';

-- -----------------------------------------------------------------------------
-- Mega-menu link + legacy slug redirect
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, colleges_item.id, p.title_en, p.title_hi, p.id, p.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items academics
  ON academics.menu_id = m.id AND academics.label_en = 'Academics' AND academics.parent_id IS NULL
JOIN ccshau_menu_items colleges_item
  ON colleges_item.parent_id = academics.id AND colleges_item.label_en = 'Colleges'
JOIN ccshau_pages p ON p.slug = 'college-of-agricultural-engineering-and-technology'
WHERE m.location = 'header'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi WHERE mi.menu_id = m.id AND mi.page_id = p.id
  );

INSERT INTO ccshau_url_redirects (legacy_path, new_path, redirect_type, is_active, notes)
SELECT v.legacy_path, v.new_path, 301, true, v.notes
FROM (
  VALUES
    (
      '/college/college-agricultural-engineering-technology',
      '/college/college-of-agricultural-engineering-and-technology',
      'Legacy COAET slug alias'
    ),
    (
      '/pages/college-agricultural-engineering-technology',
      '/college/college-of-agricultural-engineering-and-technology',
      'Legacy COAET pages slug'
    )
) AS v(legacy_path, new_path, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_url_redirects r WHERE r.legacy_path = v.legacy_path
);


-- #############################################################################
-- Migration: 20260706130000_faculty_profile_fields.sql
-- #############################################################################

-- Extended faculty/staff profile fields for department directory + detail pages.

DO $$ BEGIN
  CREATE TYPE ccshau_staff_member_type AS ENUM ('hod', 'faculty');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE ccshau_page_staff
  ADD COLUMN IF NOT EXISTS member_type ccshau_staff_member_type NOT NULL DEFAULT 'faculty',
  ADD COLUMN IF NOT EXISTS staff_slug text,
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS experience_en text,
  ADD COLUMN IF NOT EXISTS experience_hi text,
  ADD COLUMN IF NOT EXISTS detail_content_en text,
  ADD COLUMN IF NOT EXISTS detail_content_hi text;

COMMENT ON COLUMN ccshau_page_staff.member_type IS 'hod = Head of Department; faculty = regular faculty row';
COMMENT ON COLUMN ccshau_page_staff.staff_slug IS 'URL slug for public faculty detail page within department';
COMMENT ON COLUMN ccshau_page_staff.detail_content_en IS 'Full HTML profile (education, publications, etc.)';

CREATE UNIQUE INDEX IF NOT EXISTS ccshau_idx_page_staff_page_slug
  ON ccshau_page_staff (page_id, staff_slug)
  WHERE staff_slug IS NOT NULL;


-- #############################################################################
-- Migration: 20260706140000_college_map_coordinates.sql
-- #############################################################################

-- College pages: map coordinates for contact page embed
ALTER TABLE ccshau_pages
  ADD COLUMN IF NOT EXISTS map_lat numeric(10, 7),
  ADD COLUMN IF NOT EXISTS map_lng numeric(10, 7);

COMMENT ON COLUMN ccshau_pages.map_lat IS 'Latitude for college contact map embed';
COMMENT ON COLUMN ccshau_pages.map_lng IS 'Longitude for college contact map embed';


-- #############################################################################
-- Migration: 20260706150000_fix_college_root_page_type.sql
-- #############################################################################

-- College microsites under the colleges container were saved as page_type=standard
-- when edited via the page form. Restore college type for affected roots.
UPDATE ccshau_pages AS child
SET page_type = 'college'
FROM ccshau_pages AS parent
WHERE child.parent_id = parent.id
  AND parent.slug = 'colleges'
  AND child.layout_template = 'college_home'
  AND child.page_type <> 'college';


-- #############################################################################
-- Migration: 20260706160000_pg_studies_legacy_content.sql
-- #############################################################################

-- =============================================================================
-- PG Studies — legacy About content from https://www.hau.ac.in/college/pg-studies
-- (About PG Studies only; News and Student Corner excluded)
-- Public URL: /pages/pg-studies
-- =============================================================================

UPDATE ccshau_pages
SET
  title_hi = 'स्नातकोत्तर अध्ययन',
  excerpt_en = 'Dean, Postgraduate Studies — CCS Haryana Agricultural University, Hisar.',
  excerpt_hi = 'डीन, स्नातकोत्तर अध्ययन — चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार।',
  layout_template = 'office_portal',
  layout_config = jsonb_build_object(
    'hero', true,
    'headOfficer', true,
    'contacts', true,
    'staff', false,
    'gallery', false,
    'mainContent', false,
    'leftSidebar', false,
    'rightSidebar', false,
    'collegeTopMenu', false,
    'farmersCta', true,
    'heroContactButton', false
  ),
  head_name_en = 'Dr. Ramesh Kumar',
  head_name_hi = 'डॉ. रमेश कुमार',
  head_role_en = 'Dean',
  head_role_hi = 'डीन',
  featured_image_path = 'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg',
  office_cta_enabled = true,
  content_en = $en$
<p>Dean, Postgraduate Studies office basically shoulders the following responsibilities:</p>
<ol>
<li>To upgrade the course work in view of the ICAR recommendations and the stakeholders of the State and implementation thereof in letter and spirit.</li>
<li>To monitor the postgraduate research in the university.</li>
<li>To conduct the activities such as admissions, registrations, appointment of examiners, evaluation of thesis, preparation of transcripts, organizing convocation and providing degrees, selections for gold medals, best teacher awards, etc.</li>
</ol>
<p>The Dean, Post-graduate Studies has been entrusted the responsibility of postgraduate teaching at the university in consultation with the Deans of the constituent colleges, Director of Research and Director of Extension Education. Further, Dean is responsible for coordination of research of post-graduate students and its integration with the thrust areas of research. The course curriculum has been updated from time to time as per ICAR guidelines and also by keeping in view the specific requirements of Haryana State.</p>
$en$,
  content_hi = $hi$
<p>डीन, स्नातकोत्तर अध्ययन कार्यालय मूल रूप से निम्नलिखित जिम्मेदारियों का निर्वहन करता है:</p>
<ol>
<li>आईसीएआर की सिफारिशों और राज्य के हितधारकों के दृष्टिगत पाठ्यक्रम कार्य को उन्नत करना और उसे शाब्दिक एवं व्यावहारिक रूप से लागू करना।</li>
<li>विश्वविद्यालय में स्नातकोत्तर अनुसंधान की निगरानी करना।</li>
<li>प्रवेश, पंजीकरण, परीक्षकों की नियुक्ति, शोध प्रबंध मूल्यांकन, ट्रांसक्रिप्ट तैयारी, दीक्षांत समारोह आयोजन, डिग्री प्रदान करना, स्वर्ण पदक चयन, सर्वश्रेष्ठ शिक्षक पुरस्कार आदि गतिविधियों का संचालन करना।</li>
</ol>
<p>डीन, स्नातकोत्तर अध्ययन को घटक महाविद्यालयों के डीन, अनुसंधान निदेशक और विस्तार शिक्षा निदेशक के परामर्श से विश्वविद्यालय में स्नातकोत्तर शिक्षण की जिम्मेदारी सौंपी गई है। इसके अतिरिक्त, डीन स्नातकोत्तर छात्रों के अनुसंधान के समन्वय और अनुसंधान के प्रमुख क्षेत्रों के साथ उसके एकीकरण के लिए जिम्मेदार है। पाठ्यक्रम को समय-समय पर आईसीएआर दिशानिर्देशों के अनुसार तथा हरियाणा राज्य की विशिष्ट आवश्यकताओं को ध्यान में रखते हुए अद्यतन किया जाता रहा है।</p>
$hi$
WHERE slug = 'pg-studies';

DELETE FROM ccshau_page_contact_lines
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'pg-studies');

INSERT INTO ccshau_page_contact_lines (page_id, label_en, label_hi, value_en, value_hi, sort_order)
SELECT p.id, v.label_en, v.label_hi, v.value_en, v.value_hi, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'Mailing Address',
      'डाक पता',
      'Postgraduate Studies, CCS Haryana Agricultural University, Hisar - 125004, India.',
      'स्नातकोत्तर अध्ययन, चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार - 125004, भारत।',
      1
    ),
    (
      'Office',
      'कार्यालय',
      'Office : +91 1662-255326',
      'कार्यालय : +91 1662-255326',
      2
    ),
    (
      'Email Id',
      'ई-मेल आईडी',
      'dpgs@hau.ac.in',
      'dpgs@hau.ac.in',
      3
    )
) AS v(label_en, label_hi, value_en, value_hi, sort_order)
WHERE p.slug = 'pg-studies';


-- #############################################################################
-- Migration: 20260706170000_pg_studies_microsite.sql
-- #############################################################################

-- =============================================================================
-- PG Studies microsite — navigation sections + legacy content migration
-- Legacy: https://hau.ac.in/college/pg-studies
-- Public URLs: /pages/pg-studies, /pages/pg-studies/{section}
-- =============================================================================

UPDATE ccshau_pages
SET
  title_hi = 'स्नातकोत्तर अध्ययन',
  excerpt_en = 'Dean, Postgraduate Studies — CCS Haryana Agricultural University, Hisar.',
  excerpt_hi = 'डीन, स्नातकोत्तर अध्ययन — चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार।',
  layout_template = 'office_portal',
  layout_config = jsonb_build_object(
    'hero', true,
    'headOfficer', true,
    'contacts', true,
    'staff', false,
    'gallery', false,
    'mainContent', false,
    'leftSidebar', false,
    'rightSidebar', false,
    'collegeTopMenu', true,
    'farmersCta', true,
    'heroContactButton', true
  ),
  head_name_en = 'Dr. Kamal Dutt Sharma',
  head_name_hi = 'डॉ. कमल दत्त शर्मा',
  head_role_en = 'Dean Post-graduate Studies',
  head_role_hi = 'डीन, स्नातकोत्तर अध्ययन',
  featured_image_path = COALESCE(
    featured_image_path,
    'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg'
  ),
  office_cta_enabled = true,
  content_en = $en$
<p>Dean, Postgraduate Studies office basically shoulders the following responsibilities:</p>
<ol>
<li>To upgrade the course work in view of the ICAR recommendations and the stakeholders of the State and implementation thereof in letter and spirit.</li>
<li>To monitor the postgraduate research in the university.</li>
<li>To conduct the activities such as admissions, registrations, appointment of examiners, evaluation of thesis, preparation of transcripts, organizing convocation and providing degrees, selections for gold medals, best teacher awards, etc.</li>
</ol>
<p>The Dean, Post-graduate Studies has been entrusted the responsibility of postgraduate teaching at the university in consultation with the Deans of the constituent colleges, Director of Research and Director of Extension Education. Further, Dean is responsible for coordination of research of post-graduate students and its integration with the thrust areas of research. The course curriculum has been updated from time to time as per ICAR guidelines and also by keeping in view the specific requirements of Haryana State.</p>
<h2>Postgraduate Programmes</h2>
<p>Presently, the university offers postgraduate programs comprising Master&rsquo;s in 43 (including MBA) and Doctor of Philosophy in 40 disciplines. In both programs, 25% students are admitted through the ICAR representing different states of India. At the beginning of 2nd Semester 2023-24, a total No. of 1349 students are on roll, comprising of 649 and 700 in M.Sc. and Ph.D. programs, respectively.</p>
<h3>Students on roll in constituent colleges</h3>
<table class="w-full border-collapse text-sm">
<thead>
<tr>
<th rowspan="2">College</th>
<th colspan="3">M.Sc. students</th>
<th colspan="3">Ph.D.</th>
</tr>
<tr>
<th>Male</th>
<th>Female</th>
<th>Total</th>
<th>Male</th>
<th>Female</th>
<th>Total</th>
</tr>
</thead>
<tbody>
<tr><td>Agriculture</td><td>268</td><td>160</td><td>428</td><td>193</td><td>133</td><td>326</td></tr>
<tr><td>Basic Sci. &amp; Humanities</td><td>28</td><td>73</td><td>97</td><td>57</td><td>192</td><td>249</td></tr>
<tr><td>Agri. Engg. &amp; Tech.</td><td>14</td><td>5</td><td>19</td><td>11</td><td>1</td><td>12</td></tr>
<tr><td>Community Science</td><td>0</td><td>74</td><td>74</td><td>0</td><td>84</td><td>84</td></tr>
<tr><td>Fisheries Sci.</td><td>12</td><td>1</td><td>13</td><td>9</td><td>6</td><td>15</td></tr>
<tr><td>Biotech.</td><td>6</td><td>12</td><td>18</td><td>5</td><td>9</td><td>14</td></tr>
<tr><td><strong>TOTAL</strong></td><td><strong>328</strong></td><td><strong>325</strong></td><td><strong>649</strong></td><td><strong>275</strong></td><td><strong>425</strong></td><td><strong>700</strong></td></tr>
</tbody>
</table>
<h2>PG DIPLOMA</h2>
<p>In order to provide job-oriented and/or self-employment opportunities, trainings to fresh graduates as well as persons employed in various organizations requiring technical know-how and wanting to face the challenges in the new millennium, postgraduate diploma courses in Communication Skills in English, English-Hindi Translation in the College of Basic Sciences &amp; Humanities, and Remote Sensing and GIS Applications in Agriculture and Environment in College of Agriculture are offered every year.</p>
$en$,
  content_hi = $hi$
<p>डीन, स्नातकोत्तर अध्ययन कार्यालय मूल रूप से निम्नलिखित जिम्मेदारियों का निर्वहन करता है:</p>
<ol>
<li>आईसीएआर की सिफारिशों और राज्य के हितधारकों के दृष्टिगत पाठ्यक्रम कार्य को उन्नत करना और उसे शाब्दिक एवं व्यावहारिक रूप से लागू करना।</li>
<li>विश्वविद्यालय में स्नातकोत्तर अनुसंधान की निगरानी करना।</li>
<li>प्रवेश, पंजीकरण, परीक्षकों की नियुक्ति, शोध प्रबंध मूल्यांकन, ट्रांसक्रिप्ट तैयारी, दीक्षांत समारोह आयोजन, डिग्री प्रदान करना, स्वर्ण पदक चयन, सर्वश्रेष्ठ शिक्षक पुरस्कार आदि गतिविधियों का संचालन करना।</li>
</ol>
<p>डीन, स्नातकोत्तर अध्ययन को घटक महाविद्यालयों के डीन, अनुसंधान निदेशक और विस्तार शिक्षा निदेशक के परामर्श से विश्वविद्यालय में स्नातकोत्तर शिक्षण की जिम्मेदारी सौंपी गई है।</p>
<h2>स्नातकोत्तर कार्यक्रम</h2>
<p>वर्तमान में विश्वविद्यालय 43 (एमबीए सहित) विषयों में मास्टर और 40 विषयों में डॉक्टर ऑफ फिलॉसफी कार्यक्रम प्रदान करता है। 2023-24 के दूसरे सेमेस्टर की शुरुआत में कुल 1349 छात्र नामांकित हैं, जिनमें 649 एम.एससी. और 700 पीएच.डी. में हैं।</p>
<h2>पीजी डिप्लोमा</h2>
<p>रोजगार और स्वरोजगार के अवसर प्रदान करने हेतु मूल विज्ञान एवं मानविकी महाविद्यालय में अंग्रेजी संचार कौशल तथा कृषि महाविद्यालय में कृषि और पर्यावरण में रिमोट सेंसिंग और जीआईएस अनुप्रयोगों में स्नातकोत्तर डिप्लोमा पाठ्यक्रम प्रस्तुत किए जाते हैं।</p>
$hi$
WHERE slug = 'pg-studies';

-- -----------------------------------------------------------------------------
-- Child section pages
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  parent_id, page_type, layout_template, layout_config, status, published_at, sort_order
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  v.excerpt_en,
  v.excerpt_hi,
  v.content_en,
  v.content_hi,
  hub.id,
  'standard',
  'standard',
  v.layout_config,
  'published',
  now(),
  v.sort_order
FROM ccshau_pages hub
CROSS JOIN (
  VALUES
    (
      'pg-course-catalogue',
      'PG Course Catalogue',
      'पीजी पाठ्यक्रम सूची',
      'Download PG course catalogues by college.',
      'महाविद्यालयवार पीजी पाठ्यक्रम सूची डाउनलोड करें।',
      $cat_en$
<h2>PG Course Catalogue</h2>
<table class="w-full border-collapse text-sm">
<tbody>
<tr><td class="p-3 text-center"><strong>GENERAL INFORMATION</strong></td></tr>
<tr><td class="p-3 text-center"><a href="https://hau.ac.in/storage/app/uploads/5ezPa9MBTSaosf4iL3alw0opcyVOs2EghZ9tIRfT.pdf" target="_blank" rel="noopener noreferrer">COMPULSORY NON CREDIT COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/4qsHgyZznwgDH4ZOLgjmkxwaB3i8a2ZZBbO8Tlal.pdf" target="_blank" rel="noopener noreferrer">COAE&amp;T COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/WixIHW5kumtRtsVzH2S3wpO52csylhmI3WJjlpXV.pdf" target="_blank" rel="noopener noreferrer">COA COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/LIyoiUCb1Le2AQpyDtIXKLyJ9FOA9LcK1FJr5oMZ.pdf" target="_blank" rel="noopener noreferrer">COBS&amp;H COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/goC61ogk1WeNCIjDZxr6JZbaKr4SE9vNo5nfhJ1P.pdf" target="_blank" rel="noopener noreferrer">COHS COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/Mjc0AsMXhMPyez4jMP2GxUFUiav8b05T0dyXr6FV.pdf" target="_blank" rel="noopener noreferrer">CFST COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/oWIlHuGNEnOcuX37lno0rq0OUVKfrqgxwFAwI8Eb.pdf" target="_blank" rel="noopener noreferrer">FISHERIES COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://hau.ac.in/storage/app/uploads/gEeKazQHqicdKXfshBC9Pay7QkEv8IkGTwU3ayli.pdf" target="_blank" rel="noopener noreferrer">BIOTECHNOLOGY COURSES</a></td></tr>
</tbody>
</table>
$cat_en$,
      $cat_hi$
<h2>पीजी पाठ्यक्रम सूची</h2>
<p>महाविद्यालयवार पीजी पाठ्यक्रम सूची के लिए नीचे दिए गए लिंक पर क्लिक करें।</p>
$cat_hi$,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', false, 'staff', false,
        'gallery', false, 'mainContent', true, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      1
    ),
    (
      'pg-proforma',
      'PG Proforma',
      'पीजी प्रपत्र',
      'Downloadable PG proforma and examination forms.',
      'डाउनलोड योग्य पीजी प्रपत्र और परीक्षा फॉर्म।',
      $pro_en$
<h2>PG Proforma</h2>
<ol>
<li><a href="https://hau.ac.in/storage/app/uploads/Hg1ChoXQUdWyXmQ1WKkw9WxF1cJc3AxcKkHJbP2N.doc" target="_blank" rel="noopener noreferrer"><strong>PG-1.doc</strong></a> (Recommendations of Advisory Committee)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/Ip1UZK1i7jyQrCpKCnn6CCXe2aKyEtULFB68ugPZ.doc" target="_blank" rel="noopener noreferrer"><strong>PG-2.doc</strong></a> (Programme of Work)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/HndmRlymGd3sUYWRNmyKnJ3nMsyfEb0yx0WKFikp.doc" target="_blank" rel="noopener noreferrer"><strong>PG-3.doc</strong></a> (Submission of Synopsis)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/SbGAg3ZbthZfOsYu95DJHREdwBXWZY9PtYla7KvG.pdf" target="_blank" rel="noopener noreferrer"><strong>PG-4.pdf</strong></a> (Preliminary Written Examination)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/Uk66lgl9WhCvFOZ8hrLbU4lofXxEEQbF0jSEuITE.doc" target="_blank" rel="noopener noreferrer"><strong>PG-5A.doc</strong></a> (Preliminary Oral Examination Panel)</li>
<li><a href="https://www.hau.ac.in/storage/app/uploads/71ComFzqH6s3lzTCA8ZW5LltBl5H5x9ttQRYvHMK.pdf" target="_blank" rel="noopener noreferrer"><strong>PG-5B</strong></a> (External Examiner Panel)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/J9u8UW7F2O2WhsXSlLXRy2iCT7Ah080Rqu1UhKZx.doc" target="_blank" rel="noopener noreferrer"><strong>PG-6.doc</strong></a> (Certificate of Preliminary Examination Ph.D)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/5yzk1fW9xjbsNDGrTEA0rQS66u3Szd9yCyc7xp7J.doc" target="_blank" rel="noopener noreferrer"><strong>PG-7.doc</strong></a> (Report on the Preliminary Examination for the Final Examination)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/nOYVcp1FLMaM2beECscPQLFbIETAYZl27kVPVlS8.doc" target="_blank" rel="noopener noreferrer"><strong>PG-8.doc</strong></a> (Thesis Seminar Certificate)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/BcFjtKLSZotTneVBA7hQQ2jYQCnLGRdIUXJ3R5wi.doc" target="_blank" rel="noopener noreferrer"><strong>PG-9.doc</strong></a> (Thesis Submission Proforma)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/octfteOHScfTCbwDJzpWd1z77GWub3rPxsW2JRqB.doc" target="_blank" rel="noopener noreferrer"><strong>PG-10.doc</strong></a> (Certificate of Oral Examination)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/Px0T4LWWZ48utLeafl5yWH7RtT6iCAFe8oSdCQ5n.doc" target="_blank" rel="noopener noreferrer"><strong>I-Grade.doc</strong></a></li>
<li><a href="https://hau.ac.in/storage/app/uploads/UdUrfIol8arMZunMCdPA6ynKBOAYFHiD7qtfWy6v.doc" target="_blank" rel="noopener noreferrer"><strong>Instructor Report.doc</strong></a></li>
<li><a href="https://hau.ac.in/storage/app/uploads/cwxdS3FmMXbBWNxxOlsCJ8fBWUEByBNQqvO0bBs2.rtf" target="_blank" rel="noopener noreferrer"><strong>REMUNERATION TO EXAMINERS.doc</strong></a></li>
<li><a href="https://hau.ac.in/storage/app/uploads/skr5HYvBgCxMzxtg5pDwkrBOz7c6Bj5GhyUjoOnX.pdf" target="_blank" rel="noopener noreferrer"><strong>Plagiarism Verification Certificate.pdf</strong></a></li>
<li><a href="https://hau.ac.in/registration/pgs-registration" target="_blank" rel="noopener noreferrer"><strong>Apply online for attending Seminar/Workshop etc.</strong></a></li>
</ol>
$pro_en$,
      $pro_hi$
<h2>पीजी प्रपत्र</h2>
<p>नीचे दिए गए लिंक से पीजी प्रपत्र डाउनलोड करें।</p>
$pro_hi$,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', false, 'staff', false,
        'gallery', false, 'mainContent', true, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      2
    ),
    (
      'seminar-registration',
      'Seminar Registration',
      'सेमिनार पंजीकरण',
      'Online registration for PG seminars and workshops.',
      'पीजी सेमिनार और कार्यशालाओं के लिए ऑनलाइन पंजीकरण।',
      $sem_en$
<h2>Seminar Registration</h2>
<p>RA/SRF/JRF/M.Tech./Ph.D. students can apply online for attending seminars, workshops and related academic events.</p>
<p><a class="inline-flex rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white no-underline hover:bg-emerald-500" href="https://hau.ac.in/registration/pgs-registration" target="_blank" rel="noopener noreferrer">Apply online for Seminar Registration</a></p>
$sem_en$,
      $sem_hi$
<h2>सेमिनार पंजीकरण</h2>
<p>आरए/एसआरएफ/जेआरएफ/एम.टेक./पीएच.डी. छात्र सेमिनार और कार्यशालाओं हेतु ऑनलाइन आवेदन कर सकते हैं।</p>
<p><a href="https://hau.ac.in/registration/pgs-registration" target="_blank" rel="noopener noreferrer">ऑनलाइन पंजीकरण के लिए यहाँ क्लिक करें</a></p>
$sem_hi$,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', false, 'staff', false,
        'gallery', false, 'mainContent', true, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      3
    ),
    (
      'pg-studies-gallery',
      'Gallery',
      'गैलरी',
      'Photo gallery from Post Graduate Studies.',
      'स्नातकोत्तर अध्ययन की फोटो गैलरी।',
      NULL,
      NULL,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', false, 'staff', false,
        'gallery', true, 'mainContent', false, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      4
    ),
    (
      'pg-studies-contact',
      'Contact Us',
      'संपर्क करें',
      'Contact Post Graduate Studies office.',
      'स्नातकोत्तर अध्ययन कार्यालय से संपर्क करें।',
      NULL,
      NULL,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', true, 'staff', false,
        'gallery', false, 'mainContent', false, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      5
    )
) AS v(slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, layout_config, sort_order)
WHERE hub.slug = 'pg-studies'
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  title_en = EXCLUDED.title_en,
  title_hi = EXCLUDED.title_hi,
  excerpt_en = EXCLUDED.excerpt_en,
  excerpt_hi = EXCLUDED.excerpt_hi,
  content_en = EXCLUDED.content_en,
  content_hi = EXCLUDED.content_hi,
  layout_config = EXCLUDED.layout_config,
  sort_order = EXCLUDED.sort_order,
  status = 'published',
  published_at = COALESCE(ccshau_pages.published_at, now());

-- Gallery images
DELETE FROM ccshau_page_gallery_items
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'pg-studies-gallery');

INSERT INTO ccshau_page_gallery_items (
  page_id, image_url, thumbnail_url, title_en, title_hi, sort_order, is_active
)
SELECT p.id, v.image_url, v.thumbnail_url, v.title_en, v.title_hi, v.sort_order, true
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    ('https://hau.ac.in/public/images/college/banner/44/1624419644.jpg', 'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg', 'PG Studies Block', 'पीजी अध्ययन ब्लॉक', 1),
    ('https://hau.ac.in/public/images/college/banner/44/1624419644.jpg', 'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg', 'Campus', 'परिसर', 2)
) AS v(image_url, thumbnail_url, title_en, title_hi, sort_order)
WHERE p.slug = 'pg-studies-gallery';


-- #############################################################################
-- Migration: 20260706180000_pg_studies_page_type_fix.sql
-- #############################################################################

-- PG Studies is a standard CMS hub (/pages/pg-studies), not a college microsite.
UPDATE ccshau_pages
SET page_type = 'standard'
WHERE slug = 'pg-studies';


-- #############################################################################
-- Migration: 20260706190000_pg_seminar_registrations.sql
-- #############################################################################

-- =============================================================================
-- PG Seminar / Workshop registration submissions
-- Legacy form: https://hau.ac.in/registration/pgs-registration
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE ccshau_pg_seminar_registration_status AS ENUM (
    'submitted',
    'under_review',
    'approved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ccshau_pg_seminar_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number text NOT NULL UNIQUE,
  student_name text NOT NULL,
  admission_number text NOT NULL,
  department text,
  student_degree text,
  gender text CHECK (gender IN ('male', 'female')),
  category text CHECK (category IN ('SC', 'ST', 'OBC', 'PH', 'GEN')),
  is_foreigner boolean,
  country_name text,
  seminar_title text,
  duration_from date NOT NULL,
  duration_to date NOT NULL,
  source_of_advertisement text,
  organizing_institute_address text,
  paper_status text[] NOT NULL DEFAULT '{}',
  last_submission_date date,
  seminars_attended_last_two_years text,
  is_relevant_to_subject boolean,
  funds_from_outside_agency boolean,
  registration_fee numeric(12, 2),
  travel_grant numeric(12, 2),
  total_liability numeric(12, 2),
  outside_funding_full_payment text,
  outside_funding_partial_payment text,
  funding_agency_name text,
  combined_with_other_purpose boolean,
  other_relevant_info text,
  status ccshau_pg_seminar_registration_status NOT NULL DEFAULT 'submitted',
  admin_remarks text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ccshau_pg_seminar_duration_check CHECK (duration_to >= duration_from)
);

COMMENT ON TABLE ccshau_pg_seminar_registrations IS 'CCSHAU_ PG seminar/workshop registration form submissions';

CREATE INDEX IF NOT EXISTS ccshau_idx_pg_seminar_reg_status
  ON ccshau_pg_seminar_registrations (status);

CREATE INDEX IF NOT EXISTS ccshau_idx_pg_seminar_reg_created_at
  ON ccshau_pg_seminar_registrations (created_at DESC);

CREATE INDEX IF NOT EXISTS ccshau_idx_pg_seminar_reg_admission
  ON ccshau_pg_seminar_registrations (admission_number);

CREATE TRIGGER ccshau_trg_pg_seminar_registrations_updated_at
  BEFORE UPDATE ON ccshau_pg_seminar_registrations
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_pg_seminar_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_pg_seminar_reg_insert_anon
  ON ccshau_pg_seminar_registrations FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY ccshau_pol_pg_seminar_reg_select_authenticated
  ON ccshau_pg_seminar_registrations FOR SELECT TO authenticated
  USING (true);

-- Replace external link placeholder with on-page form
UPDATE ccshau_pages
SET
  content_en = NULL,
  content_hi = NULL,
  excerpt_en = 'Online application form for attending Seminar/Workshop etc. for RA/SRF/JRF/M.Tech./Ph.D students.',
  excerpt_hi = 'आरए/एसआरएफ/जेआरएफ/एम.टेक./पीएच.डी. छात्रों के लिए सेमिनार/कार्यशाला हेतु ऑनलाइन आवेदन पत्र।'
WHERE slug = 'seminar-registration';


-- #############################################################################
-- Migration: 20260707100000_page_news_ticker_items.sql
-- #############################################################################

-- Per-page scrolling news ticker items (yellow marquee on college/office pages)

CREATE TABLE IF NOT EXISTS ccshau_page_news_ticker_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  title_en text NOT NULL,
  title_hi text,
  href text,
  is_new boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_page_news_ticker_items IS 'CCSHAU_ scrolling news ticker headlines for configurable college pages';

CREATE INDEX IF NOT EXISTS ccshau_idx_page_news_ticker_items_page
  ON ccshau_page_news_ticker_items (page_id, sort_order);

CREATE TRIGGER ccshau_trg_page_news_ticker_items_updated_at
  BEFORE UPDATE ON ccshau_page_news_ticker_items
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_page_news_ticker_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ccshau_pol_page_news_ticker_items_select_active ON ccshau_page_news_ticker_items;
CREATE POLICY ccshau_pol_page_news_ticker_items_select_active
  ON ccshau_page_news_ticker_items FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM ccshau_pages p
      WHERE p.id = page_id AND p.status = 'published'
    )
  );

DROP POLICY IF EXISTS ccshau_pol_page_news_ticker_items_select_authenticated ON ccshau_page_news_ticker_items;
CREATE POLICY ccshau_pol_page_news_ticker_items_select_authenticated
  ON ccshau_page_news_ticker_items FOR SELECT TO authenticated USING (true);


-- #############################################################################
-- Migration: 20260707110000_page_news_ticker_expires_file.sql
-- #############################################################################

-- Optional expiry and file attachment for page news ticker items

ALTER TABLE ccshau_page_news_ticker_items
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS file_path text;

COMMENT ON COLUMN ccshau_page_news_ticker_items.expires_at IS 'When set, headline is hidden from the public ticker after this time';
COMMENT ON COLUMN ccshau_page_news_ticker_items.file_path IS 'Storage path (bucket/key) for optional PDF or document link';

CREATE INDEX IF NOT EXISTS ccshau_idx_page_news_ticker_items_expires
  ON ccshau_page_news_ticker_items (expires_at)
  WHERE expires_at IS NOT NULL;


-- #############################################################################
-- Migration: 20260707120000_page_student_corner_items.sql
-- #############################################################################

-- Per-page student corner link items (static link panel on college pages)

CREATE TABLE IF NOT EXISTS ccshau_page_student_corner_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  title_en text NOT NULL,
  title_hi text,
  href text,
  file_path text,
  expires_at timestamptz,
  is_new boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_page_student_corner_items IS 'CCSHAU_ student corner links for configurable college pages';

CREATE INDEX IF NOT EXISTS ccshau_idx_page_student_corner_items_page
  ON ccshau_page_student_corner_items (page_id, sort_order);

CREATE INDEX IF NOT EXISTS ccshau_idx_page_student_corner_items_expires
  ON ccshau_page_student_corner_items (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE TRIGGER ccshau_trg_page_student_corner_items_updated_at
  BEFORE UPDATE ON ccshau_page_student_corner_items
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_page_student_corner_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ccshau_pol_page_student_corner_items_select_active ON ccshau_page_student_corner_items;
CREATE POLICY ccshau_pol_page_student_corner_items_select_active
  ON ccshau_page_student_corner_items FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM ccshau_pages p
      WHERE p.id = page_id AND p.status = 'published'
    )
  );

DROP POLICY IF EXISTS ccshau_pol_page_student_corner_items_select_authenticated ON ccshau_page_student_corner_items;
CREATE POLICY ccshau_pol_page_student_corner_items_select_authenticated
  ON ccshau_page_student_corner_items FOR SELECT TO authenticated USING (true);


-- #############################################################################
-- Migration: 20260707130000_directorate_type_b.sql
-- #############################################################################

-- Type B directorates: self-root college microsites + college_root_id trigger fix

-- Standalone college roots (directorates) must set college_root_id = self on insert.
CREATE OR REPLACE FUNCTION ccshau_set_page_college_root_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_root uuid;
  v_parent_slug text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.page_type = 'college' THEN
      IF NEW.parent_id IS NULL THEN
        NEW.college_root_id := NEW.id;
        RETURN NEW;
      END IF;

      SELECT slug INTO v_parent_slug FROM ccshau_pages WHERE id = NEW.parent_id;
      IF v_parent_slug = 'colleges' THEN
        NEW.college_root_id := NEW.id;
        RETURN NEW;
      END IF;
    END IF;

    IF NEW.parent_id IS NOT NULL THEN
      SELECT college_root_id INTO v_root FROM ccshau_pages WHERE id = NEW.parent_id;
      IF v_root IS NOT NULL THEN
        NEW.college_root_id := v_root;
        RETURN NEW;
      END IF;

      SELECT p.college_root_id INTO v_root
      FROM ccshau_pages child
      JOIN ccshau_pages p ON p.id = child.parent_id
      WHERE child.id = NEW.parent_id AND p.page_type = 'college';

      IF v_root IS NOT NULL THEN
        NEW.college_root_id := v_root;
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  v_root := ccshau_resolve_college_root_id(NEW.id);
  IF v_root IS NOT NULL THEN
    NEW.college_root_id := v_root;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill self-root for any college page missing college_root_id.
UPDATE ccshau_pages p
SET college_root_id = p.id
WHERE p.page_type = 'college'
  AND p.college_root_id IS NULL
  AND (
    p.parent_id IS NULL
    OR EXISTS (
      SELECT 1 FROM ccshau_pages parent
      WHERE parent.id = p.parent_id AND parent.slug = 'colleges'
    )
  );

-- Promote directorate stubs to Type B college microsites (public URL /college/{slug}).
UPDATE ccshau_pages
SET
  page_type = 'college',
  layout_template = 'college_home',
  layout_config = jsonb_build_object(
    'hero', true,
    'headOfficer', true,
    'contacts', true,
    'staff', false,
    'gallery', false,
    'newsTicker', false,
    'studentCorner', false,
    'mainContent', true,
    'leftSidebar', false,
    'rightSidebar', false,
    'collegeTopMenu', true,
    'farmersCta', false,
    'heroContactButton', true
  ),
  office_cta_enabled = false,
  college_root_id = id
WHERE slug IN (
  'directorate-of-research',
  'directorate-of-extension-education',
  'directorate-of-students-welfare'
)
AND page_type <> 'college';


-- #############################################################################
-- Migration: 20260709150000_tender_lifecycle_enhancements.sql
-- #############################################################################

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


-- #############################################################################
-- Migration: 20260709160000_downloads_repository_enhancements.sql
-- #############################################################################

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


-- #############################################################################
-- Migration: 20260710100000_university_admin_reviewer_roles.sql
-- #############################################################################

-- Add University Admin and Reviewer/Approver CMS roles

DO $$ BEGIN
  ALTER TYPE ccshau_user_role ADD VALUE 'university_admin';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE ccshau_user_role ADD VALUE 'reviewer';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE ccshau_user_role IS
  'CMS roles: super_admin, university_admin, dept_admin, editor, reviewer, viewer';


-- #############################################################################
-- Migration: 20260710120000_tender_pending_review.sql
-- #############################################################################

-- Tender approval workflow: editors submit for review, approvers publish as open.

ALTER TYPE ccshau_tender_status ADD VALUE IF NOT EXISTS 'pending_review' AFTER 'draft';


-- #############################################################################
-- Migration: 20260710140000_department_modules.sql
-- #############################################################################

-- Phase A: Department / section → CMS module permissions matrix.

DO $$ BEGIN
  CREATE TYPE ccshau_cms_module AS ENUM (
    'pages',
    'news',
    'circulars',
    'tenders',
    'downloads',
    'media',
    'feedback'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ccshau_department_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES ccshau_departments (id) ON DELETE CASCADE,
  module ccshau_cms_module NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, module)
);

COMMENT ON TABLE ccshau_department_modules IS
  'CCSHAU_ Allowed CMS modules per department/section. Empty = unrestricted (legacy depts).';

CREATE INDEX IF NOT EXISTS ccshau_idx_department_modules_department
  ON ccshau_department_modules (department_id);

ALTER TABLE ccshau_department_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_department_modules_select
  ON ccshau_department_modules FOR SELECT TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- Seed office / section departments (RFP examples)
-- ---------------------------------------------------------------------------

INSERT INTO ccshau_departments (slug, name_en, name_hi, sort_order) VALUES
  ('purchase-tender', 'Purchase / Tender Section', 'खरीद / निविदा अनुभाग', 10),
  ('pro-media', 'PRO / Media Section', 'जनसंपर्क / मीडिया अनुभाग', 11),
  ('admin-section', 'Admin Section', 'प्रशासन अनुभाग', 12),
  ('agriculture-department', 'Agriculture Department', 'कृषि विभाग', 13)
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_hi = EXCLUDED.name_hi,
  sort_order = EXCLUDED.sort_order;

-- Purchase / Tender → tenders only
INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('tenders')) AS m(module)
WHERE d.slug = 'purchase-tender'
ON CONFLICT (department_id, module) DO NOTHING;

-- PRO / Media → news + media (press releases, photos, videos)
INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('news'), ('media')) AS m(module)
WHERE d.slug = 'pro-media'
ON CONFLICT (department_id, module) DO NOTHING;

-- Admin Section → circulars + news (official notices)
INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('circulars'), ('news')) AS m(module)
WHERE d.slug = 'admin-section'
ON CONFLICT (department_id, module) DO NOTHING;

-- Agriculture Department → pages, notices, documents, gallery
INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('pages'), ('news'), ('downloads'), ('media')) AS m(module)
WHERE d.slug = 'agriculture-department'
ON CONFLICT (department_id, module) DO NOTHING;


-- #############################################################################
-- Migration: 20260710180000_computer_section_department.sql
-- #############################################################################

-- Computer Section organizational unit (IT / technical admin).
-- Users assigned here with super_admin or university_admin roles get full CMS control.
-- No department_modules rows → unrestricted content modules for dept-scoped roles.

INSERT INTO ccshau_departments (slug, name_en, name_hi, sort_order) VALUES
  ('computer-section', 'Computer Section', 'कम्प्यूटर अनुभाग', 0)
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_hi = EXCLUDED.name_hi,
  sort_order = EXCLUDED.sort_order;


-- #############################################################################
-- Migration: 20260710190000_legacy_department_modules.sql
-- #############################################################################

-- Default CMS module restrictions for legacy university departments.
-- computer-section intentionally omitted (unrestricted for IT fallback roles).

INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (
  VALUES
    ('pages'),
    ('news'),
    ('circulars'),
    ('tenders'),
    ('downloads'),
    ('media'),
    ('feedback')
) AS m(module)
WHERE d.slug = 'university-admin'
ON CONFLICT (department_id, module) DO NOTHING;

INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('pages'), ('news'), ('circulars'), ('feedback')) AS m(module)
WHERE d.slug = 'registrar'
ON CONFLICT (department_id, module) DO NOTHING;

INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('pages'), ('news'), ('downloads'), ('feedback')) AS m(module)
WHERE d.slug = 'academics'
ON CONFLICT (department_id, module) DO NOTHING;

INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('pages'), ('news'), ('downloads')) AS m(module)
WHERE d.slug = 'research'
ON CONFLICT (department_id, module) DO NOTHING;

INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('pages'), ('news'), ('downloads'), ('media')) AS m(module)
WHERE d.slug = 'extension'
ON CONFLICT (department_id, module) DO NOTHING;

INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('circulars'), ('news'), ('downloads'), ('feedback')) AS m(module)
WHERE d.slug = 'examination'
ON CONFLICT (department_id, module) DO NOTHING;


-- #############################################################################
-- Migration: 20260722100000_department_hod_rbac.sql
-- #############################################################################

-- Department HOD RBAC: one user manages exactly one college department page.

DO $$ BEGIN
  CREATE TYPE ccshau_department_page_role AS ENUM ('dept_hod');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ccshau_user_department_pages (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  department_page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  role ccshau_department_page_role NOT NULL DEFAULT 'dept_hod',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_user_department_pages IS
  'Maps each Department HOD CMS user to exactly one college department page (office_portal).';

CREATE INDEX IF NOT EXISTS ccshau_idx_user_department_pages_page_id
  ON ccshau_user_department_pages (department_page_id);

CREATE TRIGGER ccshau_trg_user_department_pages_updated_at
  BEFORE UPDATE ON ccshau_user_department_pages
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_user_department_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_user_department_pages_select_authenticated
  ON ccshau_user_department_pages FOR SELECT TO authenticated
  USING (true);


-- #############################################################################
-- Migration: 20260722120000_faculty_qualification.sql
-- #############################################################################

-- Faculty qualification fields for department directory profiles.

ALTER TABLE ccshau_page_staff
  ADD COLUMN IF NOT EXISTS qualification_en text,
  ADD COLUMN IF NOT EXISTS qualification_hi text;

COMMENT ON COLUMN ccshau_page_staff.qualification_en IS 'Academic/professional qualification (English)';
COMMENT ON COLUMN ccshau_page_staff.qualification_hi IS 'Academic/professional qualification (Hindi)';


-- #############################################################################
-- Migration: 20260723140000_security_phase_a_locks.sql
-- #############################################################################

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
