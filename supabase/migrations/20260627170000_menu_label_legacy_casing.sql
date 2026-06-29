-- Align menu/page labels with legacy hau.ac.in casing (user spec)

UPDATE ccshau_pages
SET title_en = 'Board of management'
WHERE slug = 'board-of-management';

UPDATE ccshau_pages
SET title_en = 'Directorate of extension education'
WHERE slug = 'directorate-of-extension-education';

-- Keep menu labels in sync with linked CMS pages
UPDATE ccshau_menu_items mi
SET label_en = p.title_en
FROM ccshau_pages p
WHERE mi.page_id = p.id
  AND mi.label_en IS DISTINCT FROM p.title_en;
