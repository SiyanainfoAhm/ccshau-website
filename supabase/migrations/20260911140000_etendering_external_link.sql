-- Point footer Quick Links "e-Tendering" to Haryana eProcurement portal.

UPDATE ccshau_menu_items mi
SET
  href = 'https://etenders.hry.nic.in/nicgep/app',
  open_in_new_tab = true
FROM ccshau_menus m
WHERE mi.menu_id = m.id
  AND m.location = 'quick_links'
  AND mi.label_en = 'e-Tendering'
  AND mi.parent_id IS NULL;
