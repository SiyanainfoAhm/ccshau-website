-- =============================================================================
-- CCSHAU Website CMS — SCHEMA + BASELINE (no heavy demo content)
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
-- NOTE: Demo/college seed migrations are excluded — apply 02_ccshau_demo_seed_data.sql if needed.
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
