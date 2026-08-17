-- Remove leftover empty faculty table (# header only) scraped into KVK about HTML.
UPDATE ccshau_pages
SET
  content_en = regexp_replace(
    content_en,
    '<div[^>]*id=["'']college-faculty["''][^>]*>.*$',
    '',
    'in'
  ),
  updated_at = now()
WHERE slug LIKE 'krishi-vigyan-kendra-%'
  AND content_en ~* 'id=["'']college-faculty["'']';
