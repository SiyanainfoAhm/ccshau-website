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
