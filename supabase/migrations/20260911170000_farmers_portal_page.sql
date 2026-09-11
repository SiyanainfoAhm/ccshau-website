-- Point homepage Farmers' Portal "Click Here" to the new local page.
UPDATE ccshau_homepage_cta
SET
  href = '/farmers-portal',
  link_href = '/farmers-portal',
  updated_at = now()
WHERE id = 1;

-- CMS page so Admin → Pages can find "Farmers' Portal".
INSERT INTO ccshau_pages (
  slug,
  title_en,
  title_hi,
  excerpt_en,
  excerpt_hi,
  content_en,
  content_hi,
  page_type,
  layout_template,
  status,
  published_at,
  sort_order
)
SELECT
  'farmers-portal',
  'Farmers'' Portal',
  'किसान पोर्टल',
  'Advisories, success stories and farmer-focused services',
  'सलाह, सफलता की कहानियाँ और किसान-केंद्रित सेवाएँ',
  '<p>The public Farmers'' Portal lives at the dedicated route:</p><p><a href="/farmers-portal"><strong>Open Farmers'' Portal →</strong></a></p>',
  '<p>सार्वजनिक किसान पोर्टल समर्पित मार्ग पर उपलब्ध है:</p><p><a href="/farmers-portal"><strong>किसान पोर्टल खोलें →</strong></a></p>',
  'standard',
  'standard',
  'published',
  now(),
  0
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_pages p WHERE p.slug = 'farmers-portal'
);
