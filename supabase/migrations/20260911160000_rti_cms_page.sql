-- Ensure a CMS page exists for Admin → Pages search ("Right To Information").
-- Public document listing remains at /rti (app route).

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
  'rti',
  'Right To Information',
  'सूचना का अधिकार',
  'Official RTI Act documents, rules, and suo-motu disclosures',
  'आधिकारिक आरटीआई अधिनियम दस्तावेज़, नियम और स्वतः प्रकटीकरण',
  '<p>University Right to Information documents are published on the dedicated public listing:</p><p><a href="/rti"><strong>Open RTI document list →</strong></a></p><p>Manage documents in Admin → <strong>RTI</strong>.</p>',
  '<p>विश्वविद्यालय सूचना का अधिकार दस्तावेज़ समर्पित सार्वजनिक सूची पर प्रकाशित हैं:</p><p><a href="/rti"><strong>आरटीआई दस्तावेज़ सूची खोलें →</strong></a></p>',
  'standard',
  'standard',
  'published',
  now(),
  0
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_pages p WHERE p.slug = 'rti'
);
