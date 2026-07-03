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
