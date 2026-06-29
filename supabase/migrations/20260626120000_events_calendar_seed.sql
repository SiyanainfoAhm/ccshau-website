-- =============================================================================
-- Phase 4 Sprint 5 — event calendar demo data + event portals (CMS children)
-- =============================================================================

-- Parent shell for temporary event microsites (admin: Pages → child of event-portals)
INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  status, published_at, sort_order
) VALUES (
  'event-portals',
  'Event Portals',
  'कार्यक्रम पोर्टल',
  'Organizational parent for temporary event microsites.',
  'अस्थायी कार्यक्रम माइक्रोसाइट के लिए संगठनात्मक पृष्ठ।',
  '<p>Child pages of this entry appear as event portals at <code>/portal/[slug]</code>.</p>',
  '<p>इस पृष्ठ की उप-पृष्ठें <code>/portal/[slug]</code> पर कार्यक्रम पोर्टल के रूप में दिखती हैं।</p>',
  'published',
  now(),
  100
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  parent_id, status, published_at, sort_order
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  v.excerpt_en,
  v.excerpt_hi,
  v.content_en,
  v.content_hi,
  p.id,
  'published',
  now(),
  v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'kisan-mela-2026',
      'Kisan Mela 2026',
      'किसान मेला 2026',
      'Annual farmers fair at CCSHAU Hisar — demonstrations, stalls and expert sessions.',
      'सीसीएसएचएयू हिसार में वार्षिक किसान मेला — प्रदर्शनी और विशेषज्ञ सत्र।',
      '<p><strong>Date:</strong> 28 June 2026</p><p>Welcome to the official Kisan Mela 2026 portal. Farmers can register for stall allocation, view the programme schedule and download information brochures.</p><p>Contact the Directorate of Extension Education for enquiries.</p>',
      '<p><strong>दिनांक:</strong> 28 जून 2026</p><p>किसान मेला 2026 का आधिकारिक पोर्टल। किसान स्टॉल आवंटन और कार्यक्रम अनुसूची देख सकते हैं।</p>',
      1
    )
) AS v(slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, sort_order)
WHERE p.slug = 'event-portals'
ON CONFLICT (slug) DO NOTHING;

-- Calendar-friendly media event dates (June–November 2026)
UPDATE ccshau_media_albums
SET event_date = '2026-06-28', album_type = 'event'
WHERE slug = 'kisan-mela-2025';

UPDATE ccshau_media_albums
SET event_date = '2026-11-15'
WHERE slug = 'convocation-2025';

INSERT INTO ccshau_media_albums (
  slug, title_en, title_hi, album_type, event_date, status, published_at
) VALUES (
  'youth-festival-2026',
  'Youth Festival 2026',
  'युवा उत्सव 2026',
  'event',
  '2026-07-15',
  'published',
  now()
)
ON CONFLICT (slug) DO NOTHING;

-- Header nav: Events calendar (insert before Tenders)
UPDATE ccshau_menu_items mi
SET sort_order = mi.sort_order + 1
FROM ccshau_menus m
WHERE mi.menu_id = m.id
  AND m.location = 'header'
  AND mi.sort_order >= 5
  AND mi.parent_id IS NULL;

INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order)
SELECT m.id, 'Events', 'कार्यक्रम', '/events', 5
FROM ccshau_menus m
WHERE m.location = 'header'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.href = '/events'
  );
