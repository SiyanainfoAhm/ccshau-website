-- KVK hub page: card grid layout (matches https://hau.ac.in/all-kvk)
UPDATE ccshau_pages
SET
  title_en = 'Krishi Vigyan Kendras',
  excerpt_en = 'Krishi Vigyan Kendras across Haryana — select a KVK below to open its page.',
  content_en = '<p>CCS HAU operates Krishi Vigyan Kendras across Haryana. Select a KVK below to open its microsite.</p>',
  layout_config = jsonb_build_object(
    'hero', true,
    'headOfficer', false,
    'contacts', false,
    'staff', false,
    'gallery', false,
    'newsTicker', false,
    'studentCorner', false,
    'mainContent', true,
    'leftSidebar', false,
    'rightSidebar', false,
    'collegeTopMenu', true,
    'farmersCta', false,
    'heroContactButton', false,
    'showInDepartmentsMenu', true
  ),
  updated_at = now()
WHERE slug = 'dee-krishi-vigyan-kendras';
