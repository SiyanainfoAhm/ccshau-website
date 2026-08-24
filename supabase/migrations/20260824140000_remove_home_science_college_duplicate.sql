-- Remove unused duplicate "Home Science" college shell.
-- Canonical public college is ic-college-of-community-science (I.C. College of Community Science).

INSERT INTO ccshau_url_redirects (legacy_path, new_path, redirect_type, is_active, notes)
VALUES
  (
    '/college/ic-college-of-home-science',
    '/college/ic-college-of-community-science',
    301,
    true,
    'Old Home Science slug; college renamed to Community Science'
  ),
  (
    '/pages/ic-college-of-home-science',
    '/college/ic-college-of-community-science',
    301,
    true,
    'CMS path for deleted Home Science duplicate'
  )
ON CONFLICT (legacy_path) DO UPDATE
SET
  new_path = EXCLUDED.new_path,
  redirect_type = EXCLUDED.redirect_type,
  is_active = true,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Drop leftover menu links, if any, before deleting the page.
DELETE FROM ccshau_menu_items
WHERE page_id IN (
  SELECT id FROM ccshau_pages WHERE slug = 'ic-college-of-home-science'
);

-- Only delete the empty draft shell. Never touch the live Community Science college.
DELETE FROM ccshau_pages
WHERE slug = 'ic-college-of-home-science'
  AND status = 'draft'
  AND page_type = 'college'
  AND NOT EXISTS (
    SELECT 1
    FROM ccshau_pages child
    WHERE child.parent_id = ccshau_pages.id
  );
