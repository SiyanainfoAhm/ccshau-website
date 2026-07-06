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
