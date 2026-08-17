-- Link Krishi Vigyan Kendras into DEE → Extension services dropdown.
-- Legacy CMS page (cms/1930) was imported as orphan `krishi-vigyan-kendra`
-- under the DEE college root but never attached to `dee-department`.

UPDATE ccshau_pages
SET
  parent_id = 'c898d727-efe5-4b2e-bd2a-29e473d9f18c',
  slug = 'dee-krishi-vigyan-kendras',
  title_en = 'Krishi Vigyan Kendras',
  title_hi = COALESCE(NULLIF(title_hi, ''), 'कृषि विज्ञान केंद्र'),
  layout_template = 'office_portal',
  layout_config = jsonb_build_object(
    'hero', true,
    'headOfficer', false,
    'contacts', false,
    'staff', false,
    'gallery', false,
    'newsTicker', false,
    'studentCorner', false,
    'mainContent', true,
    'leftSidebar', true,
    'rightSidebar', false,
    'collegeTopMenu', true,
    'farmersCta', false,
    'heroContactButton', false
  ),
  sort_order = 100,
  status = 'published',
  published_at = COALESCE(published_at, now()),
  office_cta_enabled = true,
  college_root_id = '11d2f896-bfbe-443d-a978-17c067a85505',
  updated_at = now()
WHERE id = 'a0bccba8-11f0-415e-8703-f04bb193a07e';
