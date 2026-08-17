-- Disable Contact & location on KVK Kaithal, Kurukshetra, Mahendergarh, and Panipat.
UPDATE ccshau_pages
SET
  layout_config = coalesce(layout_config, '{}'::jsonb) || jsonb_build_object('contacts', false),
  updated_at = now()
WHERE slug IN (
  'krishi-vigyan-kendra-kaithal',
  'krishi-vigyan-kendra-kurukshetra',
  'krishi-vigyan-kendra-mahendergarh',
  'krishi-vigyan-kendra-panipat'
);
