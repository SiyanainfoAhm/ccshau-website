-- Hide college top nav (Home | Departments | Gallery | Contact Us) on KVK microsites.
-- Legacy KVK pages have no such bar; Quick Links in the right sidebar is the local menu.
UPDATE ccshau_pages
SET
  layout_config = coalesce(layout_config, '{}'::jsonb) || jsonb_build_object('collegeTopMenu', false),
  updated_at = now()
WHERE slug LIKE 'krishi-vigyan-kendra-%';
