-- Seed the Important links menu after the enum value has been committed.
INSERT INTO ccshau_menus (location, name_en, name_hi)
VALUES ('important_links', 'Important Links', 'महत्वपूर्ण लिंक')
ON CONFLICT (location) DO NOTHING;

INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order, is_active)
SELECT m.id, seed.label_en, seed.label_hi, seed.href, seed.sort_order, true
FROM ccshau_menus m
CROSS JOIN (VALUES
  ('RTI', 'आरटीआई', '/rti', 1),
  ('NIRF', 'एनआईआरएफ', '#', 2),
  ('Circulars', 'परिपत्र', '/circulars', 3),
  ('Tenders', 'निविदाएं', '/tenders', 4),
  ('Contact', 'संपर्क', '/contact', 5),
  ('Screen Reader Access', 'स्क्रीन रीडर', '/screen-reader-access', 6),
  ('Design Gallery', 'डिज़ाइन गैलरी', '/design', 7)
) AS seed(label_en, label_hi, href, sort_order)
WHERE m.location = 'important_links'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items i
    WHERE i.menu_id = m.id
  );
