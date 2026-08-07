-- Academics → Colleges mega-menu: ensure all 9 academic colleges appear.
-- Canonical list matches homepage Education carousel (legacyColleges).

CREATE TEMP TABLE _wanted_colleges (
  slug text PRIMARY KEY,
  sort_order int NOT NULL,
  label_en text NOT NULL,
  label_hi text
) ON COMMIT DROP;

INSERT INTO _wanted_colleges (slug, sort_order, label_en, label_hi) VALUES
  ('college-of-agriculture-hisar', 1, 'College of Agriculture, Hisar', 'कृषि महाविद्यालय, हिसार'),
  ('college-of-agriculture-kaul', 2, 'College of Agriculture, Kaul', 'कृषि महाविद्यालय, कौल'),
  ('college-of-agriculture-bawal', 3, 'College of Agriculture, Bawal', 'कृषि महाविद्यालय, बावल'),
  ('centre-of-food-science-technology', 4, 'Centre of Food Science & Technology', 'खाद्य विज्ञान और प्रौद्योगिकी केंद्र'),
  ('ic-college-of-community-science', 5, 'I.C. College of Community Science', 'आई.सी. समुदाय विज्ञान महाविद्यालय'),
  ('college-basic-sciences-humanities', 6, 'College of Basic Sciences & Humanities', 'मूल विज्ञान और मानविकी महाविद्यालय'),
  ('college-of-agricultural-engineering-and-technology', 7, 'College of Agricultural Engineering and Technology', 'कृषि अभियांत्रिकी और प्रौद्योगिकी महाविद्यालय'),
  ('college-of-fisheries-science', 8, 'College of Fisheries Science', 'मत्स्य विज्ञान महाविद्यालय'),
  ('college-of-biotechnology', 9, 'College of Biotechnology', 'जैव प्रौद्योगिकी महाविद्यालय');

-- Remove duplicate / non-canonical college children under Academics → Colleges
DELETE FROM ccshau_menu_items mi
USING ccshau_menus m,
      ccshau_menu_items academics,
      ccshau_menu_items colleges,
      ccshau_pages p
WHERE m.location = 'header'
  AND academics.menu_id = m.id
  AND academics.label_en = 'Academics'
  AND academics.parent_id IS NULL
  AND colleges.parent_id = academics.id
  AND colleges.label_en = 'Colleges'
  AND mi.parent_id = colleges.id
  AND mi.page_id = p.id
  AND p.slug NOT IN (SELECT slug FROM _wanted_colleges);

-- Insert missing colleges
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, colleges.id, w.label_en, w.label_hi, p.id, w.sort_order
FROM _wanted_colleges w
JOIN ccshau_pages p ON p.slug = w.slug AND p.page_type = 'college' AND p.status = 'published'
JOIN ccshau_menus m ON m.location = 'header'
JOIN ccshau_menu_items academics
  ON academics.menu_id = m.id AND academics.label_en = 'Academics' AND academics.parent_id IS NULL
JOIN ccshau_menu_items colleges
  ON colleges.parent_id = academics.id AND colleges.label_en = 'Colleges'
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_menu_items existing
  WHERE existing.parent_id = colleges.id AND existing.page_id = p.id
);

-- Refresh labels and sort order for linked items
UPDATE ccshau_menu_items mi
SET
  label_en = w.label_en,
  label_hi = w.label_hi,
  sort_order = w.sort_order
FROM _wanted_colleges w
JOIN ccshau_pages p ON p.slug = w.slug
JOIN ccshau_menus m ON m.location = 'header'
JOIN ccshau_menu_items academics
  ON academics.menu_id = m.id AND academics.label_en = 'Academics' AND academics.parent_id IS NULL
JOIN ccshau_menu_items colleges
  ON colleges.parent_id = academics.id AND colleges.label_en = 'Colleges'
WHERE mi.parent_id = colleges.id
  AND mi.page_id = p.id;
