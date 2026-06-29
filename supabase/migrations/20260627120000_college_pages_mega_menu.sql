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
