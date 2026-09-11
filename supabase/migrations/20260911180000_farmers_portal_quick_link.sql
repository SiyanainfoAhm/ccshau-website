-- Point Quick Links "Farmers' Portal" to the dedicated /farmers-portal page.

UPDATE ccshau_menu_items mi
SET
  href = '/farmers-portal',
  open_in_new_tab = false,
  updated_at = now()
FROM ccshau_menus m
WHERE mi.menu_id = m.id
  AND m.location = 'quick_links'
  AND mi.label_en = 'Farmers'' Portal'
  AND mi.parent_id IS NULL;
