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
