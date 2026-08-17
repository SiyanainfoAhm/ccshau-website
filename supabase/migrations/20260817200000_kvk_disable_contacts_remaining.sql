-- Disable Contact & location on remaining listed KVK microsites.
UPDATE ccshau_pages
SET
  layout_config = coalesce(layout_config, '{}'::jsonb) || jsonb_build_object('contacts', false),
  updated_at = now()
WHERE slug IN (
  'krishi-vigyan-kendra-kaithal',
  'krishi-vigyan-kendra-kurukshetra',
  'krishi-vigyan-kendra-mahendergarh',
  'krishi-vigyan-kendra-panipat',
  'krishi-vigyan-kendra-rohtak',
  'krishi-vigyan-kendra-sirsa',
  'krishi-vigyan-kendra-sonipat',
  'krishi-vigyan-kendra-mandkola-mewat',
  'krishi-vigyan-kendra-panchkula',
  'krishi-vigyan-kendra-ambala',
  'krishi-vigyan-kendra-karnal',
  'krishi-vigyan-kendra-nuh'
);
