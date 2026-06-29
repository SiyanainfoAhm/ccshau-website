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
