-- Point Quick Links RTI to the dedicated /rti page (not /contact).

UPDATE ccshau_menu_items mi
SET href = '/rti'
FROM ccshau_menus m
WHERE mi.menu_id = m.id
  AND m.location = 'quick_links'
  AND mi.label_en = 'RTI'
  AND mi.parent_id IS NULL;
