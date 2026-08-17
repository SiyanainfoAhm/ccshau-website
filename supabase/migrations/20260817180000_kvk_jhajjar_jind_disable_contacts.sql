-- Disable Contact & location on KVK Jhajjar and Jind microsites.
UPDATE ccshau_pages
SET
  layout_config = coalesce(layout_config, '{}'::jsonb) || jsonb_build_object('contacts', false),
  updated_at = now()
WHERE slug IN (
  'krishi-vigyan-kendra-jhajjar',
  'krishi-vigyan-kendra-jind'
);
