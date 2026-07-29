-- CCSHAU optional demo / college seed data
-- Apply AFTER schema/full script
-- Generated: 2026-07-29



-- #############################################################################
-- Migration: 20260624140000_demo_content_seed.sql
-- #############################################################################

-- =============================================================================
-- Demo content seed — 2 published items per public CMS module + homepage pages
-- Safe to re-run: ON CONFLICT (slug) DO NOTHING where applicable
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CMS pages (about, colleges parent + 2 children, + 2 general pages)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  status, published_at, sort_order
) VALUES
  (
    'about',
    'About HAU',
    'एचएयू के बारे में',
    'Chaudhary Charan Singh Haryana Agricultural University is one of Asia''s largest agricultural universities, located at Hisar.',
    'चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय एशिया के सबसे बड़े कृषि विश्वविद्यालयों में से एक है।',
    '<p>Chaudhary Charan Singh Haryana Agricultural University, popularly known as HAU, is one of Asia''s biggest agricultural universities, located at Hisar in Haryana. It is named after India''s seventh Prime Minister, Chaudhary Charan Singh.</p><p>A leader in agricultural research, HAU contributed significantly to the Green Revolution and White Revolution in India. The university became an autonomous institution on 2 February 1970.</p>',
    '<p>लोकप्रिय रूप से एचएयू के नाम से जाना जाने वाला चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय हरियाणा के हिसार में स्थित है।</p>',
    'published', now(), 1
  ),
  (
    'colleges',
    'Colleges',
    'महाविद्यालय',
    'Nine colleges offering agricultural education and research across Hisar, Kaul and Bawal.',
    'हिसार, कौल और बावल में कृषि शिक्षा और अनुसंधान के लिए नौ महाविद्यालय।',
    '<p>CCSHAU comprises constituent colleges in agriculture, basic sciences, community science, engineering, fisheries, biotechnology and food science.</p>',
    '<p>सीसीएसएचएयू में कृषि, मूल विज्ञान, समुदाय विज्ञान, अभियांत्रिकी, मत्स्य, जैव प्रौद्योगिकी और खाद्य विज्ञान के महाविद्यालय शामिल हैं।',
    'published', now(), 2
  ),
  (
    'vision-mission',
    'Vision & Mission',
    'दृष्टि और मिशन',
    'Our vision is to be a global leader in agricultural education, research and extension.',
    'कृषि शिक्षा, अनुसंधान और विस्तार में वैश्विक नेतृत्व करना हमारी दृष्टि है।',
    '<p><strong>Vision:</strong> To excel in agricultural education, research and outreach for sustainable farming and rural prosperity.</p><p><strong>Mission:</strong> To develop human resources, generate technologies and disseminate knowledge for the farming community of Haryana and India.</p>',
    '<p><strong>दृष्टि:</strong> कृषि शिक्षा, अनुसंधान और जन-जागरूकता में उत्कृष्टता।</p><p><strong>मिशन:</strong> मानव संसाधन विकास और किसानों के लिए ज्ञान प्रसार।</p>',
    'published', now(), 3
  ),
  (
    'history',
    'University History',
    'विश्वविद्यालय का इतिहास',
    'From Punjab Agricultural University campus to autonomous HAU in 1970.',
    'पंजाब कृषि विश्वविद्यालय परिसर से 1970 में स्वायत्त एचएयू।',
    '<p>HAU was initially a campus of Punjab Agricultural University, Ludhiana. After the formation of Haryana in 1966, it became an autonomous institution on 2 February 1970 under Haryana and Punjab Agricultural Universities Act.</p>',
    '<p>एचएयू की शुरुआत पंजाब कृषि विश्वविद्यालय, लुधियाना के परिसर से हुई। 1966 में हरियाणा के गठन के बाद 2 फरवरी 1970 को यह स्वायत्त संस्थान बना।</p>',
    'published', now(), 4
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
      'college-of-agriculture-hisar',
      'College of Agriculture, Hisar',
      'कृषि महाविद्यालय, हिसार',
      'Undergraduate and postgraduate programmes in agriculture at the main Hisar campus.',
      'हिसार परिसर में कृषि के स्नातक और स्नातकोत्तर कार्यक्रम।',
      '<p>The College of Agriculture, Hisar is the flagship college of CCSHAU offering B.Sc. (Hons.) Agriculture, M.Sc. and Ph.D. programmes.</p>',
      '<p>कृषि महाविद्यालय, हिसार सीसीएसएचएयू का प्रमुख महाविद्यालय है।</p>',
      1
    ),
    (
      'college-of-agriculture-kaul',
      'College of Agriculture, Kaul',
      'कृषि महाविद्यालय, कौल',
      'Agricultural education and research at the Kaul campus in Karnal district.',
      'करनाल जिले के कौल परिसर में कृषि शिक्षा और अनुसंधान।',
      '<p>The College of Agriculture, Kaul serves farmers of eastern Haryana with teaching, research and extension activities.</p>',
      '<p>कृषि महाविद्यालय, कौल पूर्वी हरियाणा के किसानों की सेवा करता है।</p>',
      2
    )
) AS v(slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, sort_order)
WHERE p.slug = 'colleges'
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- News & notices (2)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_news (
  slug, title_en, title_hi, body_en, body_hi, notice_type, category,
  status, published_at, is_featured
) VALUES
  (
    'academic-session-2026-27-begins',
    'Academic Session 2026–27 Begins',
    'शैक्षणिक सत्र 2026–27 प्रारंभ',
    '<p>Classes for the new academic session commence from 1 August 2026. Students are advised to check the examination branch portal for timetables.</p>',
    '<p>नए शैक्षणिक सत्र की कक्षाएं 1 अगस्त 2026 से प्रारंभ होंगी।</p>',
    'notice', 'academics', 'published', now(), true
  ),
  (
    'kisan-mela-2026-registration',
    'Kisan Mela 2026 — Registration Open',
    'किसान मेला 2026 — पंजीकरण प्रारंभ',
    '<p>Registration is open for Kisan Mela 2026 at CCSHAU Hisar. Farmers and agri-entrepreneurs may register online through the university portal.</p>',
    '<p>सीसीएसएचएयू हिसार में किसान मेला 2026 के लिए पंजीकरण प्रारंभ है।</p>',
    'news', 'events', 'published', now(), false
  )
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Tenders (2)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_tenders (
  tender_number, slug, title_en, title_hi, description_en, description_hi,
  category, status, published_at, closing_date
) VALUES
  (
    'TND/HAU/2026/001',
    'supply-lab-equipment-agronomy',
    'Supply of Laboratory Equipment — Agronomy Department',
    'प्रयोगशाला उपकरण की आपूर्ति — एग्रोनॉमी विभाग',
    '<p>Sealed bids are invited for supply and installation of laboratory equipment for the Department of Agronomy.</p>',
    '<p>एग्रोनॉमी विभाग के लिए प्रयोगशाला उपकरण की आपूर्ति हेतु सीलबंद बोली आमंत्रित हैं।</p>',
    'goods', 'open', now(), now() + interval '30 days'
  ),
  (
    'TND/HAU/2026/002',
    'annual-maintenance-cctv-campus',
    'Annual Maintenance Contract — CCTV Campus Network',
    'वार्षिक रखरखाव अनुबंध — सीसीटीवी कैंपस नेटवर्क',
    '<p>Tender for comprehensive annual maintenance of CCTV and access control systems across the Hisar campus.</p>',
    '<p>हिसार परिसर में सीसीटीवी प्रणाली के वार्षिक रखरखाव हेतु निविदा।</p>',
    'services', 'open', now(), now() + interval '21 days'
  )
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Circulars (2)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_circulars (
  circular_number, title_en, title_hi, status, published_at
)
SELECT v.circular_number, v.title_en, v.title_hi, v.status, v.published_at
FROM (
  VALUES
    (
      'CIR/REG/2026/101',
      'Revised Academic Calendar 2026–27',
      'संशोधित शैक्षणिक कैलेंडर 2026–27',
      'published'::ccshau_content_status,
      now()
    ),
    (
      'CIR/EXAM/2026/045',
      'Examination Form Submission — Final Year UG',
      'परीक्षा फॉर्म जमा — स्नातक अंतिम वर्ष',
      'published'::ccshau_content_status,
      now() - interval '2 days'
    )
) AS v(circular_number, title_en, title_hi, status, published_at)
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_circulars c WHERE c.circular_number = v.circular_number
);

-- -----------------------------------------------------------------------------
-- Downloads (2) — placeholder storage paths for demo listing
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_downloads (
  title_en, title_hi, category, file_path, file_name, mime_type, status
)
SELECT v.title_en, v.title_hi, v.category, v.file_path, v.file_name, v.mime_type, v.status
FROM (
  VALUES
    (
      'Academic Calendar 2026–27 (PDF)',
      'शैक्षणिक कैलेंडर 2026–27 (PDF)',
      'academic',
      'ccshau-public/demo/academic-calendar-2026-27.pdf',
      'academic-calendar-2026-27.pdf',
      'application/pdf',
      'published'::ccshau_content_status
    ),
    (
      'RTI Information Handbook',
      'आरटीआई सूचना पुस्तिका',
      'rti',
      'ccshau-public/demo/rti-handbook.pdf',
      'rti-handbook.pdf',
      'application/pdf',
      'published'::ccshau_content_status
    )
) AS v(title_en, title_hi, category, file_path, file_name, mime_type, status)
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_downloads d WHERE d.file_path = v.file_path
);

-- -----------------------------------------------------------------------------
-- Media albums (2)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_media_albums (
  slug, title_en, title_hi, album_type, event_date, status, published_at
) VALUES
  (
    'convocation-2025',
    'Convocation 2025',
    'दीक्षांत समारोह 2025',
    'event',
    '2025-11-15',
    'published',
    now()
  ),
  (
    'kisan-mela-2025',
    'Kisan Mela 2025',
    'किसान मेला 2025',
    'photo',
    '2025-03-20',
    'published',
    now()
  )
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Related links (2)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_related_links (
  title_en, title_hi, url, category, sort_order, is_external, is_active
)
SELECT v.title_en, v.title_hi, v.url, v.category, v.sort_order, v.is_external, v.is_active
FROM (
  VALUES
    (
      'ICAR — Indian Council of Agricultural Research',
      'आईसीएआर — भारतीय कृषि अनुसंधान परिषद',
      'https://icar.org.in',
      'government',
      1,
      true,
      true
    ),
    (
      'Government of Haryana',
      'हरियाणा सरकार',
      'https://haryana.gov.in',
      'government',
      2,
      true,
      true
    )
) AS v(title_en, title_hi, url, category, sort_order, is_external, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_related_links r WHERE r.url = v.url
);

-- -----------------------------------------------------------------------------
-- Banners (2) — image_path pending until uploaded in admin; listed as inactive demo
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_banners (
  title, image_path, target_url, alt_text, priority, is_active
)
SELECT v.title, v.image_path, v.target_url, v.alt_text, v.priority, v.is_active
FROM (
  VALUES
    (
      'Welcome to CCSHAU',
      'pending',
      '/pages/about',
      'CCSHAU Hisar campus',
      10,
      false
    ),
    (
      'Admissions 2026',
      'pending',
      '/contact',
      'Admissions enquiry',
      5,
      false
    )
) AS v(title, image_path, target_url, alt_text, priority, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_banners b WHERE b.title = v.title
);


-- #############################################################################
-- Migration: 20260624150000_menus_colleges_banners.sql
-- #############################################################################

-- =============================================================================
-- Menu seed + remaining college pages + active demo banners (external image URLs)
-- Safe to re-run
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Header navigation
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order)
SELECT m.id, v.label_en, v.label_hi, v.href, v.sort_order
FROM ccshau_menus m
CROSS JOIN (
  VALUES
    ('Home', 'होम', '/', 1),
    ('About', 'परिचय', '/pages/about', 2),
    ('Colleges', 'महाविद्यालय', '/pages/colleges', 3),
    ('News', 'समाचार', '/news', 4),
    ('Tenders', 'निविदाएं', '/tenders', 5),
    ('Circulars', 'परिपत्र', '/circulars', 6),
    ('Downloads', 'डाउनलोड', '/downloads', 7),
    ('Media', 'मीडिया', '/media', 8),
    ('Contact', 'संपर्क', '/contact', 9)
) AS v(label_en, label_hi, href, sort_order)
WHERE m.location = 'header'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.href = v.href AND mi.parent_id IS NULL
  );

-- -----------------------------------------------------------------------------
-- Footer links
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order)
SELECT m.id, v.label_en, v.label_hi, v.href, v.sort_order
FROM ccshau_menus m
CROSS JOIN (
  VALUES
    ('About HAU', 'एचएयू के बारे में', '/pages/about', 1),
    ('Vision & Mission', 'दृष्टि और मिशन', '/pages/vision-mission', 2),
    ('University History', 'विश्वविद्यालय का इतिहास', '/pages/history', 3),
    ('News & Notices', 'समाचार और सूचनाएं', '/news', 4),
    ('Tenders', 'निविदाएं', '/tenders', 5),
    ('Contact Us', 'संपर्क करें', '/contact', 6)
) AS v(label_en, label_hi, href, sort_order)
WHERE m.location = 'footer'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.href = v.href AND mi.parent_id IS NULL
  );

-- -----------------------------------------------------------------------------
-- Quick links (subset of common portals)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order, open_in_new_tab)
SELECT m.id, v.label_en, v.label_hi, v.href, v.sort_order, v.open_in_new_tab
FROM ccshau_menus m
CROSS JOIN (
  VALUES
    ('Online Admission', 'ऑनलाइन प्रवेश', '/contact', 1, false),
    ('e-Governance', 'ई-गवर्नेंस', 'https://hau.ac.in', 2, true),
    ('Student Corner', 'छात्र कोना', '/downloads', 3, false),
    ('e-Tendering', 'ई-निविदा', '/tenders', 4, false),
    ('NIRF', 'एनआईआरएफ', 'https://www.nirfindia.org', 5, true),
    ('RTI', 'आरटीआई', '/contact', 6, false),
    ('Digital Downloads', 'डिजिटल डाउनलोड', '/downloads', 7, false),
    ('Farmers'' Portal', 'किसान पोर्टल', '/pages/about', 8, false)
) AS v(label_en, label_hi, href, sort_order, open_in_new_tab)
WHERE m.location = 'quick_links'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.label_en = v.label_en AND mi.parent_id IS NULL
  );

-- -----------------------------------------------------------------------------
-- College child pages (7 remaining from mock)
-- -----------------------------------------------------------------------------

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
      'college-of-agriculture-bawal',
      'College of Agriculture, Bawal',
      'कृषि महाविद्यालय, बावल',
      'Agricultural education at the Bawal campus in Rewari district.',
      'रेवाड़ी जिले के बावल परिसर में कृषि शिक्षा।',
      '<p>The College of Agriculture, Bawal extends CCSHAU teaching and research to southern Haryana.</p>',
      '<p>कृषि महाविद्यालय, बावल दक्षिणी हरियाणा में शिक्षा और अनुसंधान प्रदान करता है।</p>',
      3
    ),
    (
      'centre-food-science-technology',
      'Centre of Food Science & Technology',
      'खाद्य विज्ञान और प्रौद्योगिकी केंद्र',
      'Food processing, quality assurance and post-harvest technology programmes.',
      'खाद्य प्रसंस्करण और गुणवत्ता आश्वासन कार्यक्रम।',
      '<p>The Centre of Food Science & Technology focuses on value addition, food safety and entrepreneurial skills for the agri-food sector.</p>',
      '<p>खाद्य विज्ञान केंद्र मूल्य संवर्धन और खाद्य सुरक्षा पर केंद्रित है।</p>',
      4
    ),
    (
      'ic-college-community-science',
      'I.C. College of Community Science',
      'आई.सी. समुदाय विज्ञान महाविद्यालय',
      'Home science, nutrition and community development education.',
      'गृह विज्ञान, पोषण और सामुदायिक विकास शिक्षा।',
      '<p>I.C. College of Community Science offers programmes in family resource management, textiles and extension outreach.</p>',
      '<p>समुदाय विज्ञान महाविद्यालय गृह संसाधन प्रबंधन और विस्तार शिक्षा प्रदान करता है।</p>',
      5
    ),
    (
      'college-basic-sciences-humanities',
      'College of Basic Sciences & Humanities',
      'मूल विज्ञान और मानविकी महाविद्यालय',
      'Foundational sciences supporting agricultural and allied programmes.',
      'कृषि कार्यक्रमों के लिए मूल विज्ञान।',
      '<p>The College of Basic Sciences & Humanities delivers courses in physics, chemistry, mathematics and languages for all university students.</p>',
      '<p>मूल विज्ञान महाविद्यालय भौतिकी, रसायन और गणित में पाठ्यक्रम प्रदान करता है।</p>',
      6
    ),
    (
      'college-agricultural-engineering-technology',
      'College of Agricultural Engineering and Technology',
      'कृषि अभियांत्रिकी और प्रौद्योगिकी महाविद्यालय',
      'Farm machinery, irrigation and renewable energy engineering.',
      'कृषि मशीनरी और सिंचाई अभियांत्रिकी।',
      '<p>CAET offers B.Tech. and M.Tech. programmes in agricultural engineering with strong industry linkages.</p>',
      '<p>कृषि अभियांत्रिकी महाविद्यालय बी.टेक और एम.टेक कार्यक्रम प्रदान करता है।</p>',
      7
    ),
    (
      'college-fisheries-science',
      'College of Fisheries Science',
      'मत्स्य विज्ञान महाविद्यालय',
      'Aquaculture, fish processing and fisheries extension.',
      'मत्स्य पालन और मत्स्य प्रसंस्करण।',
      '<p>The College of Fisheries Science promotes sustainable aquaculture and livelihood opportunities for fish farmers.</p>',
      '<p>मत्स्य विज्ञान महाविद्यालय टिकाऊ मत्स्य पालन को बढ़ावा देता है।</p>',
      8
    ),
    (
      'college-biotechnology',
      'College of Biotechnology',
      'जैव प्रौद्योगिकी महाविद्यालय',
      'Plant biotechnology, genomics and molecular breeding research.',
      'पादप जैव प्रौद्योगिकी और आणविक प्रजनन।',
      '<p>The College of Biotechnology advances crop improvement through modern biotech tools and collaborative research.</p>',
      '<p>जैव प्रौद्योगिकी महाविद्यालय आधुनिक जैव प्रौद्योगिकी से फसल सुधार करता है।</p>',
      9
    )
) AS v(slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, sort_order)
WHERE p.slug = 'colleges'
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Activate demo banners with external image URLs
-- -----------------------------------------------------------------------------

UPDATE ccshau_banners
SET
  image_path = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1600&q=80',
  is_active = true,
  alt_text = 'CCSHAU Hisar campus — agricultural fields'
WHERE title = 'Welcome to CCSHAU'
  AND image_path = 'pending';

UPDATE ccshau_banners
SET
  image_path = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
  is_active = true,
  alt_text = 'Admissions 2026 — golden wheat fields'
WHERE title = 'Admissions 2026'
  AND image_path = 'pending';

INSERT INTO ccshau_banners (
  title, image_path, target_url, alt_text, priority, is_active
)
SELECT v.title, v.image_path, v.target_url, v.alt_text, v.priority, v.is_active
FROM (
  VALUES
    (
      'Welcome to CCSHAU',
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1600&q=80',
      '/pages/about',
      'CCSHAU Hisar campus — agricultural fields',
      10,
      true
    ),
    (
      'Admissions 2026',
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
      '/contact',
      'Admissions 2026 — golden wheat fields',
      5,
      true
    )
) AS v(title, image_path, target_url, alt_text, priority, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_banners b WHERE b.title = v.title
);


-- #############################################################################
-- Migration: 20260626120000_events_calendar_seed.sql
-- #############################################################################

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


-- #############################################################################
-- Migration: 20260627140000_college_demo_sections.sql
-- #############################################################################

-- =============================================================================
-- College demo — hero images, section pages (Department, Gallery), richer content
-- Safe to re-run
-- =============================================================================

-- Hero + logo images for all college landing pages
UPDATE ccshau_pages
SET
  featured_image_path = 'https://images.unsplash.com/photo-1560438154-779a4a5e3e38?auto=format&fit=crop&w=1600&q=80',
  logo_image_path = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=200&q=80',
  page_type = 'college'
WHERE slug = 'college-of-agriculture-bawal';

UPDATE ccshau_pages
SET
  featured_image_path = 'https://images.unsplash.com/photo-1574943329829-1c2d1a9b4c3b?auto=format&fit=crop&w=1600&q=80',
  logo_image_path = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=200&q=80',
  page_type = 'college'
WHERE slug = 'college-of-agriculture-hisar';

UPDATE ccshau_pages
SET
  featured_image_path = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80',
  logo_image_path = 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=200&q=80',
  page_type = 'college'
WHERE slug = 'college-of-agriculture-kaul';

UPDATE ccshau_pages
SET
  featured_image_path = 'https://images.unsplash.com/photo-1503676260728-1c00da094a6b?auto=format&fit=crop&w=1600&q=80',
  page_type = 'college'
WHERE parent_id = (SELECT id FROM ccshau_pages WHERE slug = 'colleges')
  AND page_type = 'college'
  AND featured_image_path IS NULL;

-- Richer Bawal landing (matches legacy college homepage)
UPDATE ccshau_pages
SET
  excerpt_en = 'Constituent college of CCSHAU at Bawal, Rewari — undergraduate and postgraduate programmes in agriculture.',
  excerpt_hi = 'रेवाड़ी के बावल में सीसीएसएचएयू का संघटक महाविद्यालय — कृषि में स्नातक और स्नातकोत्तर कार्यक्रम।',
  content_en = '<p>The College of Agriculture, Bawal was established to extend quality agricultural education and research to the southern region of Haryana. The campus offers B.Sc. (Hons.) Agriculture and supporting diploma programmes with emphasis on crop production, soil science and extension outreach.</p><p>Students benefit from field laboratories, KVK linkages and industry exposure through the university''s research directorates.</p>',
  content_hi = '<p>कृषि महाविद्यालय, बावल दक्षिणी हरियाणा में कृषि शिक्षा और अनुसंधान के लिए स्थापित किया गया। परिसर में बी.एस.सी. (ऑनर्स) कृषि और संबंधित कार्यक्रम प्रदान किए जाते हैं।</p>'
WHERE slug = 'college-of-agriculture-bawal';

-- -----------------------------------------------------------------------------
-- Section pages under colleges (unique slugs; nav shows title_en)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  parent_id, status, published_at, sort_order, page_type
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  v.excerpt_en,
  v.excerpt_hi,
  v.content_en,
  v.content_hi,
  college.id,
  'published',
  now(),
  v.sort_order,
  'standard'
FROM ccshau_pages college
CROSS JOIN (
  VALUES
    (
      'college-of-agriculture-bawal',
      'department',
      'Department',
      'विभाग',
      'Academic departments at College of Agriculture, Bawal.',
      'बावल कृषि महाविद्यालय के शैक्षणिक विभाग।',
      '<p><strong>Departments:</strong></p><ul><li>Agronomy</li><li>Soil Science</li><li>Plant Breeding & Genetics</li><li>Entomology</li><li>Extension Education</li></ul><p>Each department offers teaching, research and extension activities aligned with CCSHAU academic regulations.</p>',
      '<p><strong>विभाग:</strong> कृषि विज्ञान, मृदा विज्ञान, पादप प्रजनन, कीट विज्ञान और विस्तार शिक्षा।</p>',
      1
    ),
    (
      'college-of-agriculture-bawal',
      'gallery',
      'Gallery',
      'गैलरी',
      'Campus photographs and events at Bawal.',
      'बावल परिसर की तस्वीरें और कार्यक्रम।',
      '<p>Photo gallery from field days, kisan melas, convocation and campus infrastructure at the Bawal college. Upload additional albums via the university Media Centre admin.</p>',
      '<p>बावल महाविद्यालय के किसान मेला, दीक्षांत और परिसर की तस्वीरें।</p>',
      2
    ),
    (
      'college-of-agriculture-hisar',
      'hisar-department',
      'Department',
      'विभाग',
      'Flagship agriculture departments at the main Hisar campus.',
      'हिसार परिसर के प्रमुख कृषि विभाग।',
      '<p>The College of Agriculture, Hisar hosts departments of Agronomy, Horticulture, Plant Pathology, Agricultural Economics and more — offering UG, PG and Ph.D. programmes.</p>',
      '<p>कृषि महाविद्यालय, हिसार में कृषि विज्ञान, बागवानी, वनस्पति रोग विज्ञान और अन्य विभाग।</p>',
      1
    ),
    (
      'college-of-agriculture-hisar',
      'hisar-gallery',
      'Gallery',
      'गैलरी',
      'Hisar campus life in pictures.',
      'हिसार परिसर की झलक।',
      '<p>Images from research farms, student activities and national seminars held at the Hisar campus.</p>',
      '<p>अनुसंधान फार्म, छात्र गतिविधियों और सेमिनार की तस्वीरें।</p>',
      2
    ),
    (
      'college-of-agriculture-kaul',
      'kaul-department',
      'Department',
      'विभाग',
      'Departments serving eastern Haryana farmers.',
      'पूर्वी हरियाणा के किसानों की सेवा करने वाले विभाग।',
      '<p>The Kaul campus departments focus on crop improvement, soil health and farmer participatory research for Karnal and adjoining districts.</p>',
      '<p>कौल परिसर के विभाग फसल सुधार और मृदा स्वास्थ्य पर केंद्रित हैं।</p>',
      1
    ),
    (
      'college-of-agriculture-kaul',
      'kaul-gallery',
      'Gallery',
      'गैलरी',
      'Kaul campus gallery.',
      'कौल परिसर गैलरी।',
      '<p>Extension activities, field demonstrations and campus facilities at College of Agriculture, Kaul.</p>',
      '<p>कौल में विस्तार गतिविधियों और प्रदर्शनों की तस्वीरें।</p>',
      2
    )
) AS v(college_slug, slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, sort_order)
WHERE college.slug = v.college_slug
  AND college.page_type = 'college'
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Administration mega-menu demo (2 levels + placeholder children)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order)
SELECT m.id, 'Administration', 'प्रशासन', '#', 2
FROM ccshau_menus m
WHERE m.location = 'header'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.label_en = 'Administration' AND mi.parent_id IS NULL
  );

INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, href, sort_order)
SELECT m.id, admin_item.id, v.label_en, v.label_hi, v.href, v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items admin_item
  ON admin_item.menu_id = m.id AND admin_item.label_en = 'Administration' AND admin_item.parent_id IS NULL
CROSS JOIN (
  VALUES
    ('Vice-Chancellor', 'कुलपति', '/pages/about', 1),
    ('Registrar', 'कुलसचिव', '/pages/about', 2),
    ('Board of Management', 'प्रबंध बोर्ड', '/pages/vision-mission', 3),
    ('Comptroller', 'नियंत्रक', '/contact', 4)
) AS v(label_en, label_hi, href, sort_order)
WHERE m.location = 'header'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi
    WHERE mi.menu_id = m.id AND mi.parent_id = admin_item.id AND mi.label_en = v.label_en
  );


-- #############################################################################
-- Migration: 20260627160000_main_header_menu.sql
-- #############################################################################

-- =============================================================================
-- Main header navigation — matches legacy hau.ac.in IA (user specification)
-- Replaces all header menu items on apply
-- =============================================================================

-- CMS page stubs for menu links (edit content in Admin → Pages)
INSERT INTO ccshau_pages (slug, title_en, title_hi, excerpt_en, status, published_at, sort_order)
SELECT v.slug, v.title_en, v.title_hi, v.excerpt_en, 'published', now(), v.sort_order
FROM (
  VALUES
    ('board-of-management', 'Board of management', 'प्रबंध बोर्ड', 'Board of Management, CCSHAU.', 10),
    ('vice-chancellor', 'Vice-Chancellor', 'कुलपति', 'Office of the Vice-Chancellor.', 11),
    ('registrar', 'Registrar', 'कुलसचिव', 'Office of the Registrar.', 12),
    ('comptroller', 'Comptroller', 'नियंत्रक', 'Office of the Comptroller.', 13),
    ('admissions', 'Admissions', 'प्रवेश', 'University admissions information.', 20),
    ('admissions-international-students', 'Admissions for International Students', 'अंतर्राष्ट्रीय छात्र प्रवेश', 'International student admissions.', 21),
    ('pg-studies', 'PG Studies', 'स्नातकोत्तर अध्ययन', 'Postgraduate programmes.', 22),
    ('ug-studies', 'UG Studies', 'स्नातक अध्ययन', 'Undergraduate programmes.', 23),
    ('scholarships-fellowships', 'Scholarship & Fellowships', 'छात्रवृत्ति और फेलोशिप', 'Scholarships and fellowships.', 24),
    ('university-calendar-volume-ii', 'University Calander Volume-II', 'विश्वविद्यालय कैलेंडर खंड-II', 'Academic calendar volume II.', 25),
    ('college-wise-degree-programmes', 'College wise degree programmes', 'महाविद्यालयवार डिग्री कार्यक्रम', 'Degree programmes by college.', 26),
    ('directorate-of-research', 'Directorate of Research', 'अनुसंधान निदेशालय', 'Directorate of Research.', 30),
    ('directorate-of-extension-education', 'Directorate of extension education', 'विस्तार शिक्षा निदेशालय', 'Directorate of Extension Education.', 31),
    ('human-resource-management', 'Human Resource Management', 'मानव संसाधन प्रबंधन', 'Human Resource Management.', 32),
    ('directorate-of-students-welfare', 'Directorate of Students Welfare', 'छात्र कल्याण निदेशालय', 'Directorate of Students Welfare.', 33),
    ('estate-office', 'Estate Office', 'एस्टेट कार्यालय', 'Estate Office.', 34),
    ('awards', 'Awards', 'पुरस्कार', 'University awards and honors.', 40),
    ('nehru-library', 'Nehru Library', 'नेहरू पुस्तकालय', 'Nehru Library, CCSHAU.', 41),
    ('hostel', 'Hostel', 'छात्रावास', 'University hostels.', 50),
    ('sports', 'Sports', 'खेल', 'Sports facilities and activities.', 51),
    ('hospital', 'Hospital', 'अस्पताल', 'University hospital.', 52),
    ('landscape-unit', 'Land Scap Unit', 'लैंडस्केप इकाई', 'Landscape unit.', 53),
    ('campus-school', 'Campus School', 'परिसर विद्यालय', 'Campus school.', 54),
    ('major-initiatives', 'Major Initiatives', 'प्रमुख पहल', 'Major university initiatives.', 55),
    ('international-linkage', 'International Linkage', 'अंतर्राष्ट्रीय संबद्धता', 'International collaborations.', 56)
) AS v(slug, title_en, title_hi, excerpt_en, sort_order)
ON CONFLICT (slug) DO NOTHING;

-- Replace header menu
DELETE FROM ccshau_menu_items mi
USING ccshau_menus m
WHERE mi.menu_id = m.id AND m.location = 'header';

-- Level 1
INSERT INTO ccshau_menu_items (menu_id, label_en, label_hi, href, sort_order)
SELECT m.id, v.label_en, v.label_hi, v.href, v.sort_order
FROM ccshau_menus m
CROSS JOIN (
  VALUES
    ('Homepage', 'होम', '/', 1),
    ('Administration', 'प्रशासन', '#', 2),
    ('Academics', 'शिक्षा', '#', 3),
    ('Directorates', 'निदेशालय', '#', 4),
    ('Awards & Honors', 'पुरस्कार और सम्मान', '#', 5),
    ('Nehru Library', 'नेहरू पुस्तकालय', '/pages/nehru-library', 6),
    ('Campus Life', 'कैंपस जीवन', '#', 7)
) AS v(label_en, label_hi, href, sort_order)
WHERE m.location = 'header';

-- Administration → level 2
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, parent.id, p.title_en, p.title_hi, p.id, v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items parent ON parent.menu_id = m.id AND parent.label_en = 'Administration' AND parent.parent_id IS NULL
CROSS JOIN (
  VALUES
    ('board-of-management', 1),
    ('vice-chancellor', 2),
    ('registrar', 3),
    ('comptroller', 4)
) AS v(page_slug, sort_order)
JOIN ccshau_pages p ON p.slug = v.page_slug
WHERE m.location = 'header';

-- Academics → Colleges (level 2 shell)
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, href, sort_order)
SELECT m.id, academics.id, 'Colleges', 'महाविद्यालय', '#', 1
FROM ccshau_menus m
JOIN ccshau_menu_items academics ON academics.menu_id = m.id AND academics.label_en = 'Academics' AND academics.parent_id IS NULL
WHERE m.location = 'header';

-- Academics → Colleges → three agriculture colleges (level 3)
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, colleges.id, p.title_en, p.title_hi, p.id, v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items academics ON academics.menu_id = m.id AND academics.label_en = 'Academics' AND academics.parent_id IS NULL
JOIN ccshau_menu_items colleges ON colleges.parent_id = academics.id AND colleges.label_en = 'Colleges'
CROSS JOIN (
  VALUES
    ('college-of-agriculture-hisar', 1),
    ('college-of-agriculture-bawal', 2),
    ('college-of-agriculture-kaul', 3)
) AS v(page_slug, sort_order)
JOIN ccshau_pages p ON p.slug = v.page_slug AND p.page_type = 'college'
WHERE m.location = 'header';

-- Academics → other level 2 items
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, academics.id, p.title_en, p.title_hi, p.id, v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items academics ON academics.menu_id = m.id AND academics.label_en = 'Academics' AND academics.parent_id IS NULL
CROSS JOIN (
  VALUES
    ('admissions', 2),
    ('admissions-international-students', 3),
    ('pg-studies', 4),
    ('ug-studies', 5),
    ('scholarships-fellowships', 6),
    ('university-calendar-volume-ii', 7),
    ('college-wise-degree-programmes', 8)
) AS v(page_slug, sort_order)
JOIN ccshau_pages p ON p.slug = v.page_slug
WHERE m.location = 'header';

-- Directorates → Research / Extension shells (level 2)
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, href, sort_order)
SELECT m.id, directorates.id, v.label_en, v.label_hi, '#', v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items directorates ON directorates.menu_id = m.id AND directorates.label_en = 'Directorates' AND directorates.parent_id IS NULL
CROSS JOIN (
  VALUES
    ('Research', 'अनुसंधान', 1),
    ('Extension', 'विस्तार', 2)
) AS v(label_en, label_hi, sort_order)
WHERE m.location = 'header';

-- Directorates → Research → Directorate of Research (level 3)
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, research.id, p.title_en, p.title_hi, p.id, 1
FROM ccshau_menus m
JOIN ccshau_menu_items directorates ON directorates.menu_id = m.id AND directorates.label_en = 'Directorates' AND directorates.parent_id IS NULL
JOIN ccshau_menu_items research ON research.parent_id = directorates.id AND research.label_en = 'Research'
JOIN ccshau_pages p ON p.slug = 'directorate-of-research'
WHERE m.location = 'header';

-- Directorates → Extension → Directorate of Extension Education (level 3)
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, extension.id, p.title_en, p.title_hi, p.id, 1
FROM ccshau_menus m
JOIN ccshau_menu_items directorates ON directorates.menu_id = m.id AND directorates.label_en = 'Directorates' AND directorates.parent_id IS NULL
JOIN ccshau_menu_items extension ON extension.parent_id = directorates.id AND extension.label_en = 'Extension'
JOIN ccshau_pages p ON p.slug = 'directorate-of-extension-education'
WHERE m.location = 'header';

-- Directorates → direct level 2 links
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, directorates.id, p.title_en, p.title_hi, p.id, v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items directorates ON directorates.menu_id = m.id AND directorates.label_en = 'Directorates' AND directorates.parent_id IS NULL
CROSS JOIN (
  VALUES
    ('human-resource-management', 3),
    ('directorate-of-students-welfare', 4),
    ('estate-office', 5)
) AS v(page_slug, sort_order)
JOIN ccshau_pages p ON p.slug = v.page_slug
WHERE m.location = 'header';

-- Awards & Honors → Awards
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, awards.id, p.title_en, p.title_hi, p.id, 1
FROM ccshau_menus m
JOIN ccshau_menu_items awards ON awards.menu_id = m.id AND awards.label_en = 'Awards & Honors' AND awards.parent_id IS NULL
JOIN ccshau_pages p ON p.slug = 'awards'
WHERE m.location = 'header';

-- Campus Life → level 2
INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, campus.id, p.title_en, p.title_hi, p.id, v.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items campus ON campus.menu_id = m.id AND campus.label_en = 'Campus Life' AND campus.parent_id IS NULL
CROSS JOIN (
  VALUES
    ('hostel', 1),
    ('sports', 2),
    ('hospital', 3),
    ('landscape-unit', 4),
    ('campus-school', 5),
    ('major-initiatives', 6),
    ('international-linkage', 7)
) AS v(page_slug, sort_order)
JOIN ccshau_pages p ON p.slug = v.page_slug
WHERE m.location = 'header';

-- Nehru Library top-level: link via page_id for consistency
UPDATE ccshau_menu_items mi
SET page_id = p.id, href = NULL
FROM ccshau_menus m, ccshau_pages p
WHERE mi.menu_id = m.id AND m.location = 'header'
  AND mi.label_en = 'Nehru Library' AND mi.parent_id IS NULL
  AND p.slug = 'nehru-library';


-- #############################################################################
-- Migration: 20260627170000_menu_label_legacy_casing.sql
-- #############################################################################

-- Align menu/page labels with legacy hau.ac.in casing (user spec)

UPDATE ccshau_pages
SET title_en = 'Board of management'
WHERE slug = 'board-of-management';

UPDATE ccshau_pages
SET title_en = 'Directorate of extension education'
WHERE slug = 'directorate-of-extension-education';

-- Keep menu labels in sync with linked CMS pages
UPDATE ccshau_menu_items mi
SET label_en = p.title_en
FROM ccshau_pages p
WHERE mi.page_id = p.id
  AND mi.label_en IS DISTINCT FROM p.title_en;


-- #############################################################################
-- Migration: 20260630210000_homepage_legacy_colleges.sql
-- #############################################################################

-- Align college slugs and logos with legacy hau.ac.in homepage (Education At University)

UPDATE ccshau_pages child
SET
  slug = v.new_slug,
  logo_image_path = v.logo_url
FROM ccshau_pages parent
CROSS JOIN (
  VALUES
    (
      'centre-food-science-technology',
      'centre-of-food-science-technology',
      'https://hau.ac.in/public/images/college/logo/8/1547026866.jpg'
    ),
    (
      'ic-college-community-science',
      'ic-college-of-home-science',
      'https://hau.ac.in/public/images/college/logo/9/1741857160.jpg'
    ),
    (
      'college-agricultural-engineering-technology',
      'college-of-agricultural-engineering-and-technology',
      'https://hau.ac.in/public/images/college/logo/11/1538048892.png'
    ),
    (
      'college-fisheries-science',
      'college-of-fisheries-science',
      'https://hau.ac.in/public/images/college/logo/65/1716002752.png'
    ),
    (
      'college-biotechnology',
      'college-of-biotechnology',
      'https://hau.ac.in/public/images/college/logo/67/1782193277.jpg'
    )
) AS v(old_slug, new_slug, logo_url)
WHERE child.parent_id = parent.id
  AND parent.slug = 'colleges'
  AND child.slug = v.old_slug
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_pages existing WHERE existing.slug = v.new_slug AND existing.id <> child.id
  );

UPDATE ccshau_pages child
SET logo_image_path = v.logo_url
FROM ccshau_pages parent
CROSS JOIN (
  VALUES
    ('college-of-agriculture-hisar', 'https://hau.ac.in/public/images/college/logo/2/1540803791.jpg'),
    ('college-of-agriculture-kaul', 'https://hau.ac.in/public/images/college/logo/6/1540803865.jpg'),
    ('college-of-agriculture-bawal', 'https://hau.ac.in/public/images/college/logo/7/1552737173.jpg'),
    ('centre-of-food-science-technology', 'https://hau.ac.in/public/images/college/logo/8/1547026866.jpg'),
    ('ic-college-of-home-science', 'https://hau.ac.in/public/images/college/logo/9/1741857160.jpg'),
    ('college-of-basic-sciences-humanities', 'https://hau.ac.in/public/images/college/logo/10/1540803999.jpg'),
    (
      'college-of-agricultural-engineering-and-technology',
      'https://hau.ac.in/public/images/college/logo/11/1538048892.png'
    ),
    ('college-of-fisheries-science', 'https://hau.ac.in/public/images/college/logo/65/1716002752.png'),
    ('college-of-biotechnology', 'https://hau.ac.in/public/images/college/logo/67/1782193277.jpg')
) AS v(slug, logo_url)
WHERE child.parent_id = parent.id
  AND parent.slug = 'colleges'
  AND child.slug = v.slug
  AND (child.logo_image_path IS NULL OR child.logo_image_path = 'pending');


-- #############################################################################
-- Migration: 20260703140000_college_of_agriculture_hisar_content.sql
-- #############################################################################

-- =============================================================================
-- College of Agriculture, Hisar — bilingual about page content (legacy hau.ac.in)
-- =============================================================================

UPDATE ccshau_pages
SET
  head_name_en = 'Dr. Ramesh Kumar Goyal',
  head_name_hi = 'डॉ. रमेश कुमार गोयल',
  head_role_en = 'Professor and Dean',
  head_role_hi = 'प्राध्यापक एवं डीन',
  head_image_path = 'https://hau.ac.in/storage/app/uploads/college-user/lx5W3WSwssNlucNJqrqXDduHuZdhMaN4oeqm068W.png',
  logo_image_path = 'https://hau.ac.in/public/images/college/logo/2/1540803791.jpg',
  layout_config = jsonb_build_object(
    'hero', false,
    'headOfficer', true,
    'contacts', true,
    'staff', false,
    'leftSidebar', false,
    'rightSidebar', false,
    'mainContent', true,
    'farmersCta', false,
    'collegeTopMenu', true,
    'heroContactButton', false
  ),
  content_en = $en$
<h2>About College Of Agriculture, Hisar</h2>
<p>The College of Agriculture at Hisar came into existence on July 17, 1962 as Government Agriculture College. The College was initially affiliated to Punjab University, Chandigarh. It became the integral part of Haryana Agricultural University, Hisar with its creation in February 2, 1970. The college of agriculture, a citadel of agricultural education, research and extension, is one of the most important and largest constituent colleges of CCS Haryana Agricultural University. The college continuously caters into the needs of agricultural research and education of the students and stakeholders from the state as well as from other states and countries.</p>
<p>The College of Agriculture, Hisar is proud of its upgraded facilities, which include modern classrooms, well-equipped departmental libraries, laboratories, seminar rooms, examination hall and student farms. College is having well qualified and experienced faculty. College has 14 departments covering every aspect of agriculture education as per ICAR guidelines,</p>
<p>The central facilities of the university allow the college to produce brilliant graduates and postgraduates who are well prepared for the future endeavours in the field of contemporary agriculture. The college gives equal importance on co-curricular activities, such as cultural, sports, NCC and NSS, in addition to curricular ones, as these activities help students grow into better human beings. Through these activities, students' general growth, interpersonal skills and sense of patriotism are fostered.</p>
<p>The best theoretical and practical education is given to the students with the assistance of highly educated instructors. The unique exposure to practical and classroom education, followed by a year of practical crop production and six months of Rural Agriculture Work Experience (RAWE) helps to develop future-ready agriculture graduates in a variety of agricultural disciplines. To develop the students' entrepreneurial skills and prepare them for future ventures into production and marketing, a special focus is placed on agro-based skill-oriented activities such as organic farming, sustainable agriculture, beekeeping, mushroom cultivation, vermi-composting, dairying and horticulture. The college promotes and supports international exposure to its students. Additionally, the college is effective at educating students from other nations.</p>
<p>These congenial conditions of the college equip students for the future, enabling them to achieve academically and better serve the farming community, as seen by the majority of gold medals won by students at this college as well as representation our students at national and international level. This graduates of the college are serving universities, banks, armed forces, cooperative sector and other public and private sectors successfully.</p>
<h3>OBJECTIVES</h3>
<p>The College adopts the following goals and objectives which permeate in offering of various curricula and undertakes research and extension activities by its departments to:</p>
<ul>
<li>Provide world-class education to our students.</li>
<li>Maintain a strong basic and applied research programme to support all segments of agriculture and allied sectors through enhanced agricultural productivity and environmental sustainability.</li>
<li>Serve the rural society through extension activities by disseminating research-based knowledge.</li>
<li>Assist stakeholders through value-added endeavours, bio-based products, bio-processing, crop diversification etc.</li>
<li>Monitor climate change impacts on agricultural systems and develop mitigation strategies adopting interdisciplinary approaches.</li>
</ul>
<p><a href="https://www.hau.ac.in/storage/app/uploads/CIpDwZYmgUxyqkDffAvhyvTJviSaMzOvQIQjRwdH.pdf" target="_blank" rel="noopener noreferrer">Under Graduate Course Catalogue</a></p>
$en$,
  content_hi = $hi$
<h2>हिसार कृषि महाविद्यालय के बारे में</h2>
<p>हिसार में कृषि महाविद्यालय की स्थापना 17 जुलाई, 1962 को सरकारी कृषि महाविद्यालय के रूप में हुई थी। महाविद्यालय प्रारंभ में पंजाब विश्वविद्यालय, चंडीगढ़ से संबद्ध था। 2 फरवरी, 1970 को हरियाणा कृषि विश्वविद्यालय, हिसार की स्थापना के साथ यह उसका अभिन्न अंग बन गया। कृषि महाविद्यालय, कृषि शिक्षा, अनुसंधान और विस्तार का एक केंद्र है, जो चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय के सबसे महत्वपूर्ण और बड़े घटक महाविद्यालयों में से एक है। यह महाविद्यालय राज्य के साथ-साथ अन्य राज्यों और देशों के छात्रों और हितधारकों की कृषि अनुसंधान और शिक्षा की आवश्यकताओं की निरंतर पूर्ति करता है।</p>
<p>हिसार का कृषि महाविद्यालय अपनी उन्नत सुविधाओं पर गर्व करता है, जिनमें आधुनिक कक्षाएं, सुसज्जित विभागीय पुस्तकालय, प्रयोगशालाएं, सेमिनार कक्ष, परीक्षा हॉल और छात्र खेत शामिल हैं। महाविद्यालय में सुयोग्य और अनुभवी संकाय है। महाविद्यालय में आईसीएआर दिशानिर्देशों के अनुसार कृषि शिक्षा के प्रत्येक पहलू को कवर करने वाले 14 विभाग हैं।</p>
<p>विश्वविद्यालय की केंद्रीय सुविधाएं महाविद्यालय को उत्कृष्ट स्नातक और स्नातकोत्तर तैयार करने में सक्षम बनाती हैं, जो समकालीन कृषि के क्षेत्र में भविष्य के प्रयासों के लिए पूरी तरह तैयार हैं। महाविद्यालय पाठ्यक्रम के अतिरिक्त सह-पाठ्यचर्या गतिविधियों जैसे सांस्कृतिक, खेल, एनसीसी और एनएसएस को भी समान महत्व देता है, क्योंकि ये गतिविधियां छात्रों को बेहतर मानव बनने में मदद करती हैं। इन गतिविधियों के माध्यम से छात्रों के समग्र विकास, पारस्परिक कौशल और देशभक्ति की भावना को बढ़ावा मिलता है।</p>
<p>अत्यधिक शिक्षित प्रशिक्षकों की सहायता से छात्रों को सर्वोत्तम सैद्धांतिक और व्यावहारिक शिक्षा प्रदान की जाती है। व्यावहारिक और कक्षा शिक्षा के अनूठे अनुभव के बाद एक वर्ष की व्यावहारिक फसल उत्पादन और छह माह की ग्रामीण कृषि कार्य अनुभव (RAWE) विभिन्न कृषि विषयों में भविष्य के लिए तैयार कृषि स्नातकों के विकास में सहायक है। छात्रों के उद्यमी कौशल विकसित करने और उत्पादन और विपणन में भविष्य के उद्यमों के लिए उन्हें तैयार करने हेतु जैविक खेती, सतत कृषि, मधुमक्खी पालन, मशरूम उत्पादन, वर्मी-कम्पोस्टिंग, डेयरी और बागवानी जैसी कृषि आधारित कौशल-उन्मुखी गतिविधियों पर विशेष ध्यान दिया जाता है। महाविद्यालय अपने छात्रों को अंतर्राष्ट्रीय अनुभव प्रदान करने और समर्थन करने के लिए प्रोत्साहित करता है। इसके अतिरिक्त, महाविद्यालय अन्य देशों के छात्रों को प्रभावी ढंग से शिक्षित करने में सक्षम है।</p>
<p>महाविद्यालय की अनुकूल परिस्थितियां छात्रों को भविष्य के लिए सुसज्जित करती हैं, जिससे वे शैक्षणिक रूप से उत्कृष्ट प्रदर्शन कर सकें और कृषक समुदाय की बेहतर सेवा कर सकें, जैसा कि इस महाविद्यालय के छात्रों द्वारा जीते गए अधिकांश स्वर्ण पदकों तथा राष्ट्रीय और अंतर्राष्ट्रीय स्तर पर हमारे छात्रों की भागीदारी से स्पष्ट है। इस महाविद्यालय के स्नातक विश्वविद्यालयों, बैंकों, सशस्त्र बलों, सहकारी क्षेत्र और अन्य सार्वजनिक एवं निजी क्षेत्रों में सफलतापूर्वक सेवा कर रहे हैं।</p>
<h3>उद्देश्य</h3>
<p>महाविद्यालय निम्नलिखित लक्ष्यों और उद्देश्यों को अपनाता है, जो विभिन्न पाठ्यक्रमों की पेशकश में व्याप्त हैं और जिनके लिए इसके विभाग अनुसंधान और विस्तार गतिविधियां संपादित करते हैं:</p>
<ul>
<li>हमारे छात्रों को विश्व स्तरीय शिक्षा प्रदान करना।</li>
<li>कृषि उत्पादकता और पर्यावरणीय स्थिरता में वृद्धि के माध्यम से कृषि और संबद्ध क्षेत्रों के सभी खंडों का समर्थन करने हेतु एक मजबूत मूलभूत और अनुप्रयुक्त अनुसंधान कार्यक्रम बनाए रखना।</li>
<li>अनुसंधान आधारित ज्ञान के प्रसार के माध्यम से विस्तार गतिविधियों द्वारा ग्रामीण समाज की सेवा करना।</li>
<li>मूल्य संवर्धित प्रयासों, जैव आधारित उत्पादों, जैव प्रसंस्करण, फसल विविधीकरण आदि के माध्यम से हितधारकों की सहायता करना।</li>
<li>कृषि प्रणालियों पर जलवायु परिवर्तन के प्रभावों की निगरानी करना और अंतःविषयक दृष्टिकोण अपनाते हुए शमन रणनीतियों का विकास करना।</li>
</ul>
<p><a href="https://www.hau.ac.in/storage/app/uploads/CIpDwZYmgUxyqkDffAvhyvTJviSaMzOvQIQjRwdH.pdf" target="_blank" rel="noopener noreferrer">स्नातक पाठ्यक्रम सूची</a></p>
$hi$
WHERE slug = 'college-of-agriculture-hisar';

DELETE FROM ccshau_page_contact_lines
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'college-of-agriculture-hisar');

INSERT INTO ccshau_page_contact_lines (page_id, label_en, label_hi, value_en, value_hi, sort_order)
SELECT p.id, v.label_en, v.label_hi, v.value_en, v.value_hi, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'Mailing Address',
      'डाक पता',
      'College of Agriculture CCS Haryana Agricultural University Hisar - 125004, (Haryana) India',
      'कृषि महाविद्यालय, चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय हिसार - 125004, (हरियाणा) भारत',
      1
    ),
    (
      'Office',
      'कार्यालय',
      'Office : +91 01662255401, +91 9416397529',
      'कार्यालय : +91 01662255401, +91 9416397529',
      2
    ),
    (
      'Email Id',
      'ई-मेल आईडी',
      'dcoag@hau.ac.in',
      'dcoag@hau.ac.in',
      3
    )
) AS v(label_en, label_hi, value_en, value_hi, sort_order)
WHERE p.slug = 'college-of-agriculture-hisar';


-- #############################################################################
-- Migration: 20260703150000_college_contact_emails.sql
-- #############################################################################

-- Add secondary email for College of Agriculture, Hisar contact page
UPDATE ccshau_page_contact_lines
SET
  value_en = 'dcoag@hau.ac.in, dcoaghau@gmail.com',
  value_hi = 'dcoag@hau.ac.in, dcoaghau@gmail.com'
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'college-of-agriculture-hisar')
  AND label_en = 'Email Id';


-- #############################################################################
-- Migration: 20260703160000_agricultural_economics_faculty.sql
-- #############################################################################

-- Agricultural Economics (Hisar) — faculty migrated from legacy hau.ac.in department API
-- Source: https://www.hau.ac.in/department-faculty/teaching_staff/2/1

UPDATE ccshau_pages
SET
  layout_template = 'office_portal',
  layout_config = jsonb_build_object(
    'hero', true,
    'headOfficer', false,
    'contacts', false,
    'staff', true,
    'leftSidebar', true,
    'rightSidebar', false,
    'mainContent', true,
    'farmersCta', false,
    'collegeTopMenu', true,
    'heroContactButton', false
  )
WHERE slug = 'agricultural-economics-hisar';

UPDATE ccshau_page_sidebar_items
SET
  label_hi = 'संकाय',
  content_en = NULL,
  content_hi = NULL
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'agricultural-economics-hisar')
  AND label_en = 'Faculty';

DELETE FROM ccshau_page_staff
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'agricultural-economics-hisar');

INSERT INTO ccshau_page_staff (
  page_id, name_en, name_hi, designation_en, designation_hi,
  specialization_en, specialization_hi, image_path, sort_order
)
SELECT p.id, v.name_en, v.name_hi, v.designation_en, v.designation_hi,
       v.specialization_en, v.specialization_hi, v.image_path, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'Dr. DharmPal Malik',
      'डॉ. धर्म पाल मलिक',
      'Professor and Head',
      'प्राध्यापक एवं विभागाध्यक्ष',
      'Farm Management, Agriculture Finance, Agricultural Marketing & Price Analysis',
      'फार्म प्रबंधन, कृषि वित्त, कृषि विपणन एवं मूल्य विश्लेषण',
      'https://www.hau.ac.in/storage/app/uploads/college-user/ngRi8KD7UmPXkGFtlxQMiS1rNoUblq5nfA8vFjyo.png',
      1
    ),
    (
      'Dr. Sanjay Kumar',
      'डॉ. संजय कुमार',
      'Assoc. Professor',
      'सहायक प्राध्यापक',
      'Farm Management',
      'फार्म प्रबंधन',
      'https://www.hau.ac.in/storage/app/uploads/college-user/g4szECjOChfmSLgNCWKbhobCT8MA8SDbPBWEs1mN.jpeg',
      2
    ),
    (
      'Dr. Vinay Mehala',
      'डॉ. विनय मेहला',
      'Asstt. Scientist',
      'सहायक वैज्ञानिक',
      'Agricultural Marketing & Farm Management',
      'कृषि विपणन एवं फार्म प्रबंधन',
      'https://www.hau.ac.in/storage/app/uploads/college-user/zbHBIWATWZWqrmAi2pfPZA540RXn4M8jUctq8Okv.jpeg',
      3
    ),
    (
      'Dr. Sumit',
      'डॉ. सुमित',
      'Assistant Scientist (Agril. Economics)',
      'सहायक वैज्ञानिक (कृषि अर्थशास्त्र)',
      'Farm Management and Production Economics',
      'फार्म प्रबंधन एवं उत्पादन अर्थशास्त्र',
      'https://www.hau.ac.in/storage/app/uploads/college-user/YDvROz8x6tY9173V2HfjJ7iUER48INLBFMKUldjs.jpeg',
      4
    ),
    (
      'Dr. Monika Devi',
      'डॉ. मोनिका देवी',
      'Assistant Scientist (Statistics)',
      'सहायक वैज्ञानिक (सांख्यिकी)',
      'Sample Surveys, Statistical Modelling',
      'नमूना सर्वेक्षण, सांख्यिकीय मॉडलिंग',
      'https://www.hau.ac.in/storage/app/uploads/college-user/lucqGBtZ3tCUiUim90DrAzkfSqSSURaF6FkVfK3G.png',
      5
    ),
    (
      'Dr. Neeraj Pawar',
      'डॉ. नीरज पवार',
      'Assistant Scientist',
      'सहायक वैज्ञानिक',
      'Agricultural Marketing',
      'कृषि विपणन',
      'https://www.hau.ac.in/storage/app/uploads/college-user/3pJmp4MzRNIYfR59yW26DkyYhiv9yv9zgwm3gdmQ.jpeg',
      6
    ),
    (
      'Dr. Janailin S. Papang',
      'डॉ. जनैलिन एस. पापांग',
      'Assistant Professor',
      'सहायक प्राध्यापक',
      'Production economics and agricultural marketing',
      'उत्पादन अर्थशास्त्र एवं कृषि विपणन',
      'https://www.hau.ac.in/storage/app/uploads/college-user/lBLWrx2lLkjXFpMr7ayhAy6Nro7I8C4U1gGwyR7X.png',
      7
    ),
    (
      'Dr. Rijul Sihag',
      'डॉ. रिजुल सिहाग',
      'Assistant Scientist (Rural Sociology)',
      'सहायक वैज्ञानिक (ग्रामीण समाजशास्त्र)',
      'Sociology, socio-economic development',
      'समाजशास्त्र, सामाजिक-आर्थिक विकास',
      'https://www.hau.ac.in/storage/app/uploads/college-user/1kSiYTnbNQzyJ1ncTghaOLROCaFhiSf7ILfF5R9d.jpeg',
      8
    ),
    (
      'Dr. Sanjay',
      'डॉ. संजय',
      'Assistant Professor',
      'सहायक प्राध्यापक',
      'Agricultural Finance',
      'कृषि वित्त',
      'https://www.hau.ac.in/storage/app/uploads/college-user/Dnx5ylEDEA9dcyFzRcBZbxkADcaRsWXnPzQs7vOC.jpeg',
      9
    )
) AS v(
  name_en, name_hi, designation_en, designation_hi,
  specialization_en, specialization_hi, image_path, sort_order
)
WHERE p.slug = 'agricultural-economics-hisar';


-- #############################################################################
-- Migration: 20260706120000_coaet_college_migration.sql
-- #############################################################################

-- =============================================================================
-- COAET (College of Agricultural Engineering and Technology) — full microsite migration
-- Legacy: https://hau.ac.in/college/college-of-agricultural-engineering-and-technology
-- =============================================================================

-- -----------------------------------------------------------------------------
-- College home — bilingual about, dean, layout, branding
-- -----------------------------------------------------------------------------

UPDATE ccshau_pages
SET
  page_type = 'college',
  layout_template = 'college_home',
  title_hi = 'कृषि अभियांत्रिकी और प्रौद्योगिकी महाविद्यालय',
  excerpt_en = 'B.Tech. and M.Tech. programmes in agricultural engineering at the CCSHAU Hisar campus.',
  excerpt_hi = 'सीसीएसएचएयू हिसार परिसर में कृषि अभियांत्रिकी के बी.टेक. और एम.टेक. कार्यक्रम।',
  featured_image_path = COALESCE(
    featured_image_path,
    'https://hau.ac.in/public/images/college/banner/11/1538048893.jpg'
  ),
  logo_image_path = COALESCE(
    logo_image_path,
    'https://hau.ac.in/public/images/college/logo/11/1538048892.png'
  ),
  head_name_en = 'Dr. Ajay Kumar Vashisht',
  head_name_hi = 'डॉ. अजय कुमार वशिष्ठ',
  head_role_en = 'Dean',
  head_role_hi = 'डीन',
  layout_config = jsonb_build_object(
    'hero', false,
    'headOfficer', true,
    'contacts', true,
    'staff', false,
    'gallery', false,
    'mainContent', true,
    'leftSidebar', false,
    'rightSidebar', false,
    'collegeTopMenu', true,
    'farmersCta', false,
    'heroContactButton', false
  ),
  content_en = $en$
<h2>About College Of Agricultural Engineering And Technology</h2>
<p>The College of Agricultural Engineering and Technology (COAE&amp;T) is located in the main campus of CCS Haryana Agricultural University at Hisar, 170 km from Delhi on National Highway No. 10, 2 km from the Railway Station and 3 km from the Bus Stand Hisar. The undergraduate programme of B. Tech. (Agricultural Engineering) was approved in 1987 and admissions began in August 1987. The College of Agricultural Engineering and Technology was established after approval in 1992 and inaugurated on 21st August, 1992.</p>
<p>Subsequently, departments of Farm Power &amp; Machinery and Soil &amp; Water Engineering were established in 1993 and the College started awarding Master of Technology (Agril. Engg.) in the above departments. The department of Agricultural Processing &amp; Energy was created in August 1996. The section of Basic Engineering was created in October 1996. The annual intake for the undergraduate programme increased gradually from 20 to 54 students in 2010. In 2013-14, seats were reduced from 54 to 35 for B. Tech. admission to increase personal attention and practical training. Ph.D. was started in all three departments in 2016. Two new departments — Renewable and Bio-energy Engineering and Basic Engineering — were established in 2017.</p>
<h3>Mandate / Objectives of the College</h3>
<ul>
<li>Nurturing scholarly education in different branches of study in the discipline of Agricultural Engineering</li>
<li>Advancement of learning and pursuit of research in the discipline of Agricultural Engineering</li>
<li>Undertaking extension by transferring well-proven technology for the benefit of the farming community</li>
</ul>
<h3>Academic Programs</h3>
<ol>
<li>Graduate program leading to B.Tech. (Ag. Engg.) — duration 4 years.</li>
<li>Post graduate programs leading to M.Tech. and Ph.D. in Farm Machinery &amp; Power Engg., Soil and Water Engg. and Processing and Food Engg.</li>
</ol>
$en$,
  content_hi = $hi$
<h2>कृषि अभियांत्रिकी और प्रौद्योगिकी महाविद्यालय के बारे में</h2>
<p>कृषि अभियांत्रिकी और प्रौद्योगिकी महाविद्यालय (सीओएईएंडटी) चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय के मुख्य परिसर हिसार में स्थित है। बी. टेक. (कृषि अभियांत्रिकी) स्नातक कार्यक्रम 1987 में स्वीकृत हुआ और 1992 में महाविद्यालय की स्थापना की गई।</p>
<h3>महाविद्यालय के उद्देश्य</h3>
<ul>
<li>कृषि अभियांत्रिकी के विभिन्न शाखाओं में शैक्षणिक शिक्षा का संवर्धन</li>
<li>अनुसंधान में सीखने की उन्नति</li>
<li>किसान समुदाय के लाभ हेतु प्रमाणित तकनीक का विस्तार</li>
</ul>
$hi$,
  status = 'published',
  published_at = COALESCE(published_at, now())
WHERE slug = 'college-of-agricultural-engineering-and-technology';

DELETE FROM ccshau_page_contact_lines
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'college-of-agricultural-engineering-and-technology');

INSERT INTO ccshau_page_contact_lines (page_id, label_en, label_hi, value_en, value_hi, sort_order)
SELECT p.id, v.label_en, v.label_hi, v.value_en, v.value_hi, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'Mailing Address',
      'डाक पता',
      'College of Agricultural Engineering & Technology CCS Haryana Agricultural University Hisar - 125004 Haryana (India)',
      'कृषि अभियांत्रिकी एवं प्रौद्योगिकी महाविद्यालय, चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय हिसार - 125004 (हरियाणा) भारत',
      1
    ),
    (
      'Office',
      'कार्यालय',
      'Office : 01662-255206',
      'कार्यालय : 01662-255206',
      2
    ),
    (
      'Email Id',
      'ई-मेल आईडी',
      'dcoaeg@hau.ac.in',
      'dcoaeg@hau.ac.in',
      3
    )
) AS v(label_en, label_hi, value_en, value_hi, sort_order)
WHERE p.slug = 'college-of-agricultural-engineering-and-technology';

-- -----------------------------------------------------------------------------
-- Section pages: Department + Gallery
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  parent_id, page_type, layout_template, layout_config, status, published_at, sort_order
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  v.excerpt_en,
  v.excerpt_hi,
  v.content_en,
  v.content_hi,
  college.id,
  'standard',
  v.layout_template,
  v.layout_config,
  'published',
  now(),
  v.sort_order
FROM ccshau_pages college
CROSS JOIN (
  VALUES
    (
      'coaet-department',
      'Department',
      'विभाग',
      'Engineering departments at College of Agricultural Engineering and Technology.',
      'कृषि अभियांत्रिकी महाविद्यालय के अभियांत्रिकी विभाग।',
      '<p><strong>Departments:</strong></p><ul><li>Basic Engineering</li><li>Farm Machinery &amp; Power Engineering</li><li>Instrumentation Cell</li><li>Processing and Food Engineering</li><li>Renewable and Bio-energy Engineering</li><li>Soil &amp; Water Engineering</li></ul>',
      '<p><strong>विभाग:</strong> मूल अभियांत्रिकी, कृषि मशीनरी, प्रसंस्करण, नवीकरणीय ऊर्जा और मृदा एवं जल अभियांत्रिकी।</p>',
      'standard',
      NULL::jsonb,
      1
    ),
    (
      'coaet-gallery',
      'Gallery',
      'गैलरी',
      'Photo gallery from College of Agricultural Engineering and Technology.',
      'कृषि अभियांत्रिकी महाविद्यालय की फोटो गैलरी।',
      NULL,
      NULL,
      'standard',
      jsonb_build_object(
        'hero', false,
        'headOfficer', false,
        'contacts', false,
        'staff', false,
        'gallery', true,
        'mainContent', false,
        'leftSidebar', false,
        'rightSidebar', false,
        'collegeTopMenu', true,
        'farmersCta', false,
        'heroContactButton', false
      ),
      2
    )
) AS v(slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, layout_template, layout_config, sort_order)
WHERE college.slug = 'college-of-agricultural-engineering-and-technology'
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  title_en = EXCLUDED.title_en,
  title_hi = EXCLUDED.title_hi,
  excerpt_en = EXCLUDED.excerpt_en,
  excerpt_hi = EXCLUDED.excerpt_hi,
  content_en = EXCLUDED.content_en,
  content_hi = EXCLUDED.content_hi,
  layout_template = EXCLUDED.layout_template,
  layout_config = EXCLUDED.layout_config,
  status = 'published',
  published_at = COALESCE(ccshau_pages.published_at, now());

-- -----------------------------------------------------------------------------
-- Department subsections (office portal layout)
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, parent_id, page_type, layout_template, layout_config,
  status, published_at, sort_order, office_cta_enabled
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  v.excerpt_en,
  dept_section.id,
  'standard',
  'office_portal',
  jsonb_build_object(
    'hero', true,
    'headOfficer', false,
    'contacts', false,
    'staff', true,
    'gallery', false,
    'mainContent', true,
    'leftSidebar', true,
    'rightSidebar', false,
    'collegeTopMenu', true,
    'farmersCta', false,
    'heroContactButton', false
  ),
  'published',
  now(),
  v.sort_order,
  true
FROM ccshau_pages dept_section
CROSS JOIN (
  VALUES
    ('coaet-basic-engineering', 'Basic Engineering', 'मूल अभियांत्रिकी', 'Basic Engineering department at COAET.', 1),
    ('coaet-farm-machinery-power-engineering', 'Farm Machinery & Power Engineering', 'कृषि मशीनरी एवं शक्ति अभियांत्रिकी', 'Farm Machinery & Power Engineering department at COAET.', 2),
    ('coaet-instrumentation-cell', 'Instrumentation Cell', 'इंस्ट्रूमेंटेशन सेल', 'Instrumentation Cell at COAET.', 3),
    ('coaet-processing-food-engineering', 'Processing and Food Engineering', 'प्रसंस्करण एवं खाद्य अभियांत्रिकी', 'Processing and Food Engineering department at COAET.', 4),
    ('coaet-renewable-bio-energy-engineering', 'Renewable and Bio-energy Engineering', 'नवीकरणीय एवं जैव-ऊर्जा अभियांत्रिकी', 'Renewable and Bio-energy Engineering department at COAET.', 5),
    ('coaet-soil-water-engineering', 'Soil & Water Engineering', 'मृदा एवं जल अभियांत्रिकी', 'Soil & Water Engineering department at COAET.', 6)
) AS v(slug, title_en, title_hi, excerpt_en, sort_order)
WHERE dept_section.slug = 'coaet-department'
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  layout_template = 'office_portal',
  layout_config = EXCLUDED.layout_config,
  status = 'published';

-- Sidebar tabs for each department subsection
INSERT INTO ccshau_page_sidebar_items (page_id, side, label_en, label_hi, content_en, sort_order, is_active)
SELECT p.id, 'left', 'About', 'परिचय',
       '<p>' || p.title_en || ' at College of Agricultural Engineering and Technology, CCS HAU Hisar.</p>',
       1, true
FROM ccshau_pages p
WHERE p.slug LIKE 'coaet-%'
  AND p.slug NOT IN ('coaet-department', 'coaet-gallery')
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_page_sidebar_items s
    WHERE s.page_id = p.id AND s.label_en = 'About'
  );

INSERT INTO ccshau_page_sidebar_items (page_id, side, label_en, label_hi, sort_order, is_active)
SELECT p.id, 'left', 'Faculty', 'संकाय', 2, true
FROM ccshau_pages p
WHERE p.slug LIKE 'coaet-%'
  AND p.slug NOT IN ('coaet-department', 'coaet-gallery')
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_page_sidebar_items s
    WHERE s.page_id = p.id AND s.label_en = 'Faculty'
  );

-- -----------------------------------------------------------------------------
-- Gallery images (legacy hau.ac.in college gallery)
-- -----------------------------------------------------------------------------

DELETE FROM ccshau_page_gallery_items
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'coaet-gallery');

INSERT INTO ccshau_page_gallery_items (
  page_id, image_url, thumbnail_url, title_en, title_hi, sort_order
)
SELECT p.id, v.image_url, v.thumbnail_url, v.title_en, v.title_hi, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    ('https://www.hau.ac.in/public/images/gallery/15/1545216772.jpg', 'https://www.hau.ac.in/public/images/gallery/15/1545216772.jpg', 'Campus', 'परिसर', 1),
    ('https://www.hau.ac.in/public/images/gallery/16/1545216761.jpg', 'https://www.hau.ac.in/public/images/gallery/16/1545216761.jpg', 'Campus', 'परिसर', 2),
    ('https://hau.ac.in/public/images/college/banner/11/1538048893.jpg', 'https://hau.ac.in/public/images/college/banner/11/1538048893.jpg', 'College banner', 'महाविद्यालय बैनर', 3)
) AS v(image_url, thumbnail_url, title_en, title_hi, sort_order)
WHERE p.slug = 'coaet-gallery';

-- -----------------------------------------------------------------------------
-- Mega-menu link + legacy slug redirect
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_menu_items (menu_id, parent_id, label_en, label_hi, page_id, sort_order)
SELECT m.id, colleges_item.id, p.title_en, p.title_hi, p.id, p.sort_order
FROM ccshau_menus m
JOIN ccshau_menu_items academics
  ON academics.menu_id = m.id AND academics.label_en = 'Academics' AND academics.parent_id IS NULL
JOIN ccshau_menu_items colleges_item
  ON colleges_item.parent_id = academics.id AND colleges_item.label_en = 'Colleges'
JOIN ccshau_pages p ON p.slug = 'college-of-agricultural-engineering-and-technology'
WHERE m.location = 'header'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_menu_items mi WHERE mi.menu_id = m.id AND mi.page_id = p.id
  );

INSERT INTO ccshau_url_redirects (legacy_path, new_path, redirect_type, is_active, notes)
SELECT v.legacy_path, v.new_path, 301, true, v.notes
FROM (
  VALUES
    (
      '/college/college-agricultural-engineering-technology',
      '/college/college-of-agricultural-engineering-and-technology',
      'Legacy COAET slug alias'
    ),
    (
      '/pages/college-agricultural-engineering-technology',
      '/college/college-of-agricultural-engineering-and-technology',
      'Legacy COAET pages slug'
    )
) AS v(legacy_path, new_path, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM ccshau_url_redirects r WHERE r.legacy_path = v.legacy_path
);


-- #############################################################################
-- Migration: 20260706160000_pg_studies_legacy_content.sql
-- #############################################################################

-- =============================================================================
-- PG Studies — legacy About content from https://www.hau.ac.in/college/pg-studies
-- (About PG Studies only; News and Student Corner excluded)
-- Public URL: /pages/pg-studies
-- =============================================================================

UPDATE ccshau_pages
SET
  title_hi = 'स्नातकोत्तर अध्ययन',
  excerpt_en = 'Dean, Postgraduate Studies — CCS Haryana Agricultural University, Hisar.',
  excerpt_hi = 'डीन, स्नातकोत्तर अध्ययन — चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार।',
  layout_template = 'office_portal',
  layout_config = jsonb_build_object(
    'hero', true,
    'headOfficer', true,
    'contacts', true,
    'staff', false,
    'gallery', false,
    'mainContent', false,
    'leftSidebar', false,
    'rightSidebar', false,
    'collegeTopMenu', false,
    'farmersCta', true,
    'heroContactButton', false
  ),
  head_name_en = 'Dr. Ramesh Kumar',
  head_name_hi = 'डॉ. रमेश कुमार',
  head_role_en = 'Dean',
  head_role_hi = 'डीन',
  featured_image_path = 'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg',
  office_cta_enabled = true,
  content_en = $en$
<p>Dean, Postgraduate Studies office basically shoulders the following responsibilities:</p>
<ol>
<li>To upgrade the course work in view of the ICAR recommendations and the stakeholders of the State and implementation thereof in letter and spirit.</li>
<li>To monitor the postgraduate research in the university.</li>
<li>To conduct the activities such as admissions, registrations, appointment of examiners, evaluation of thesis, preparation of transcripts, organizing convocation and providing degrees, selections for gold medals, best teacher awards, etc.</li>
</ol>
<p>The Dean, Post-graduate Studies has been entrusted the responsibility of postgraduate teaching at the university in consultation with the Deans of the constituent colleges, Director of Research and Director of Extension Education. Further, Dean is responsible for coordination of research of post-graduate students and its integration with the thrust areas of research. The course curriculum has been updated from time to time as per ICAR guidelines and also by keeping in view the specific requirements of Haryana State.</p>
$en$,
  content_hi = $hi$
<p>डीन, स्नातकोत्तर अध्ययन कार्यालय मूल रूप से निम्नलिखित जिम्मेदारियों का निर्वहन करता है:</p>
<ol>
<li>आईसीएआर की सिफारिशों और राज्य के हितधारकों के दृष्टिगत पाठ्यक्रम कार्य को उन्नत करना और उसे शाब्दिक एवं व्यावहारिक रूप से लागू करना।</li>
<li>विश्वविद्यालय में स्नातकोत्तर अनुसंधान की निगरानी करना।</li>
<li>प्रवेश, पंजीकरण, परीक्षकों की नियुक्ति, शोध प्रबंध मूल्यांकन, ट्रांसक्रिप्ट तैयारी, दीक्षांत समारोह आयोजन, डिग्री प्रदान करना, स्वर्ण पदक चयन, सर्वश्रेष्ठ शिक्षक पुरस्कार आदि गतिविधियों का संचालन करना।</li>
</ol>
<p>डीन, स्नातकोत्तर अध्ययन को घटक महाविद्यालयों के डीन, अनुसंधान निदेशक और विस्तार शिक्षा निदेशक के परामर्श से विश्वविद्यालय में स्नातकोत्तर शिक्षण की जिम्मेदारी सौंपी गई है। इसके अतिरिक्त, डीन स्नातकोत्तर छात्रों के अनुसंधान के समन्वय और अनुसंधान के प्रमुख क्षेत्रों के साथ उसके एकीकरण के लिए जिम्मेदार है। पाठ्यक्रम को समय-समय पर आईसीएआर दिशानिर्देशों के अनुसार तथा हरियाणा राज्य की विशिष्ट आवश्यकताओं को ध्यान में रखते हुए अद्यतन किया जाता रहा है।</p>
$hi$
WHERE slug = 'pg-studies';

DELETE FROM ccshau_page_contact_lines
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'pg-studies');

INSERT INTO ccshau_page_contact_lines (page_id, label_en, label_hi, value_en, value_hi, sort_order)
SELECT p.id, v.label_en, v.label_hi, v.value_en, v.value_hi, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'Mailing Address',
      'डाक पता',
      'Postgraduate Studies, CCS Haryana Agricultural University, Hisar - 125004, India.',
      'स्नातकोत्तर अध्ययन, चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार - 125004, भारत।',
      1
    ),
    (
      'Office',
      'कार्यालय',
      'Office : +91 1662-255326',
      'कार्यालय : +91 1662-255326',
      2
    ),
    (
      'Email Id',
      'ई-मेल आईडी',
      'dpgs@hau.ac.in',
      'dpgs@hau.ac.in',
      3
    )
) AS v(label_en, label_hi, value_en, value_hi, sort_order)
WHERE p.slug = 'pg-studies';


-- #############################################################################
-- Migration: 20260706170000_pg_studies_microsite.sql
-- #############################################################################

-- =============================================================================
-- PG Studies microsite — navigation sections + legacy content migration
-- Legacy: https://hau.ac.in/college/pg-studies
-- Public URLs: /pages/pg-studies, /pages/pg-studies/{section}
-- =============================================================================

UPDATE ccshau_pages
SET
  title_hi = 'स्नातकोत्तर अध्ययन',
  excerpt_en = 'Dean, Postgraduate Studies — CCS Haryana Agricultural University, Hisar.',
  excerpt_hi = 'डीन, स्नातकोत्तर अध्ययन — चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार।',
  layout_template = 'office_portal',
  layout_config = jsonb_build_object(
    'hero', true,
    'headOfficer', true,
    'contacts', true,
    'staff', false,
    'gallery', false,
    'mainContent', false,
    'leftSidebar', false,
    'rightSidebar', false,
    'collegeTopMenu', true,
    'farmersCta', true,
    'heroContactButton', true
  ),
  head_name_en = 'Dr. Kamal Dutt Sharma',
  head_name_hi = 'डॉ. कमल दत्त शर्मा',
  head_role_en = 'Dean Post-graduate Studies',
  head_role_hi = 'डीन, स्नातकोत्तर अध्ययन',
  featured_image_path = COALESCE(
    featured_image_path,
    'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg'
  ),
  office_cta_enabled = true,
  content_en = $en$
<p>Dean, Postgraduate Studies office basically shoulders the following responsibilities:</p>
<ol>
<li>To upgrade the course work in view of the ICAR recommendations and the stakeholders of the State and implementation thereof in letter and spirit.</li>
<li>To monitor the postgraduate research in the university.</li>
<li>To conduct the activities such as admissions, registrations, appointment of examiners, evaluation of thesis, preparation of transcripts, organizing convocation and providing degrees, selections for gold medals, best teacher awards, etc.</li>
</ol>
<p>The Dean, Post-graduate Studies has been entrusted the responsibility of postgraduate teaching at the university in consultation with the Deans of the constituent colleges, Director of Research and Director of Extension Education. Further, Dean is responsible for coordination of research of post-graduate students and its integration with the thrust areas of research. The course curriculum has been updated from time to time as per ICAR guidelines and also by keeping in view the specific requirements of Haryana State.</p>
<h2>Postgraduate Programmes</h2>
<p>Presently, the university offers postgraduate programs comprising Master&rsquo;s in 43 (including MBA) and Doctor of Philosophy in 40 disciplines. In both programs, 25% students are admitted through the ICAR representing different states of India. At the beginning of 2nd Semester 2023-24, a total No. of 1349 students are on roll, comprising of 649 and 700 in M.Sc. and Ph.D. programs, respectively.</p>
<h3>Students on roll in constituent colleges</h3>
<table class="w-full border-collapse text-sm">
<thead>
<tr>
<th rowspan="2">College</th>
<th colspan="3">M.Sc. students</th>
<th colspan="3">Ph.D.</th>
</tr>
<tr>
<th>Male</th>
<th>Female</th>
<th>Total</th>
<th>Male</th>
<th>Female</th>
<th>Total</th>
</tr>
</thead>
<tbody>
<tr><td>Agriculture</td><td>268</td><td>160</td><td>428</td><td>193</td><td>133</td><td>326</td></tr>
<tr><td>Basic Sci. &amp; Humanities</td><td>28</td><td>73</td><td>97</td><td>57</td><td>192</td><td>249</td></tr>
<tr><td>Agri. Engg. &amp; Tech.</td><td>14</td><td>5</td><td>19</td><td>11</td><td>1</td><td>12</td></tr>
<tr><td>Community Science</td><td>0</td><td>74</td><td>74</td><td>0</td><td>84</td><td>84</td></tr>
<tr><td>Fisheries Sci.</td><td>12</td><td>1</td><td>13</td><td>9</td><td>6</td><td>15</td></tr>
<tr><td>Biotech.</td><td>6</td><td>12</td><td>18</td><td>5</td><td>9</td><td>14</td></tr>
<tr><td><strong>TOTAL</strong></td><td><strong>328</strong></td><td><strong>325</strong></td><td><strong>649</strong></td><td><strong>275</strong></td><td><strong>425</strong></td><td><strong>700</strong></td></tr>
</tbody>
</table>
<h2>PG DIPLOMA</h2>
<p>In order to provide job-oriented and/or self-employment opportunities, trainings to fresh graduates as well as persons employed in various organizations requiring technical know-how and wanting to face the challenges in the new millennium, postgraduate diploma courses in Communication Skills in English, English-Hindi Translation in the College of Basic Sciences &amp; Humanities, and Remote Sensing and GIS Applications in Agriculture and Environment in College of Agriculture are offered every year.</p>
$en$,
  content_hi = $hi$
<p>डीन, स्नातकोत्तर अध्ययन कार्यालय मूल रूप से निम्नलिखित जिम्मेदारियों का निर्वहन करता है:</p>
<ol>
<li>आईसीएआर की सिफारिशों और राज्य के हितधारकों के दृष्टिगत पाठ्यक्रम कार्य को उन्नत करना और उसे शाब्दिक एवं व्यावहारिक रूप से लागू करना।</li>
<li>विश्वविद्यालय में स्नातकोत्तर अनुसंधान की निगरानी करना।</li>
<li>प्रवेश, पंजीकरण, परीक्षकों की नियुक्ति, शोध प्रबंध मूल्यांकन, ट्रांसक्रिप्ट तैयारी, दीक्षांत समारोह आयोजन, डिग्री प्रदान करना, स्वर्ण पदक चयन, सर्वश्रेष्ठ शिक्षक पुरस्कार आदि गतिविधियों का संचालन करना।</li>
</ol>
<p>डीन, स्नातकोत्तर अध्ययन को घटक महाविद्यालयों के डीन, अनुसंधान निदेशक और विस्तार शिक्षा निदेशक के परामर्श से विश्वविद्यालय में स्नातकोत्तर शिक्षण की जिम्मेदारी सौंपी गई है।</p>
<h2>स्नातकोत्तर कार्यक्रम</h2>
<p>वर्तमान में विश्वविद्यालय 43 (एमबीए सहित) विषयों में मास्टर और 40 विषयों में डॉक्टर ऑफ फिलॉसफी कार्यक्रम प्रदान करता है। 2023-24 के दूसरे सेमेस्टर की शुरुआत में कुल 1349 छात्र नामांकित हैं, जिनमें 649 एम.एससी. और 700 पीएच.डी. में हैं।</p>
<h2>पीजी डिप्लोमा</h2>
<p>रोजगार और स्वरोजगार के अवसर प्रदान करने हेतु मूल विज्ञान एवं मानविकी महाविद्यालय में अंग्रेजी संचार कौशल तथा कृषि महाविद्यालय में कृषि और पर्यावरण में रिमोट सेंसिंग और जीआईएस अनुप्रयोगों में स्नातकोत्तर डिप्लोमा पाठ्यक्रम प्रस्तुत किए जाते हैं।</p>
$hi$
WHERE slug = 'pg-studies';

-- -----------------------------------------------------------------------------
-- Child section pages
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  parent_id, page_type, layout_template, layout_config, status, published_at, sort_order
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  v.excerpt_en,
  v.excerpt_hi,
  v.content_en,
  v.content_hi,
  hub.id,
  'standard',
  'standard',
  v.layout_config,
  'published',
  now(),
  v.sort_order
FROM ccshau_pages hub
CROSS JOIN (
  VALUES
    (
      'pg-course-catalogue',
      'PG Course Catalogue',
      'पीजी पाठ्यक्रम सूची',
      'Download PG course catalogues by college.',
      'महाविद्यालयवार पीजी पाठ्यक्रम सूची डाउनलोड करें।',
      $cat_en$
<h2>PG Course Catalogue</h2>
<table class="w-full border-collapse text-sm">
<tbody>
<tr><td class="p-3 text-center"><strong>GENERAL INFORMATION</strong></td></tr>
<tr><td class="p-3 text-center"><a href="https://hau.ac.in/storage/app/uploads/5ezPa9MBTSaosf4iL3alw0opcyVOs2EghZ9tIRfT.pdf" target="_blank" rel="noopener noreferrer">COMPULSORY NON CREDIT COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/4qsHgyZznwgDH4ZOLgjmkxwaB3i8a2ZZBbO8Tlal.pdf" target="_blank" rel="noopener noreferrer">COAE&amp;T COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/WixIHW5kumtRtsVzH2S3wpO52csylhmI3WJjlpXV.pdf" target="_blank" rel="noopener noreferrer">COA COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/LIyoiUCb1Le2AQpyDtIXKLyJ9FOA9LcK1FJr5oMZ.pdf" target="_blank" rel="noopener noreferrer">COBS&amp;H COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/goC61ogk1WeNCIjDZxr6JZbaKr4SE9vNo5nfhJ1P.pdf" target="_blank" rel="noopener noreferrer">COHS COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/Mjc0AsMXhMPyez4jMP2GxUFUiav8b05T0dyXr6FV.pdf" target="_blank" rel="noopener noreferrer">CFST COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/oWIlHuGNEnOcuX37lno0rq0OUVKfrqgxwFAwI8Eb.pdf" target="_blank" rel="noopener noreferrer">FISHERIES COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://hau.ac.in/storage/app/uploads/gEeKazQHqicdKXfshBC9Pay7QkEv8IkGTwU3ayli.pdf" target="_blank" rel="noopener noreferrer">BIOTECHNOLOGY COURSES</a></td></tr>
</tbody>
</table>
$cat_en$,
      $cat_hi$
<h2>पीजी पाठ्यक्रम सूची</h2>
<p>महाविद्यालयवार पीजी पाठ्यक्रम सूची के लिए नीचे दिए गए लिंक पर क्लिक करें।</p>
$cat_hi$,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', false, 'staff', false,
        'gallery', false, 'mainContent', true, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      1
    ),
    (
      'pg-proforma',
      'PG Proforma',
      'पीजी प्रपत्र',
      'Downloadable PG proforma and examination forms.',
      'डाउनलोड योग्य पीजी प्रपत्र और परीक्षा फॉर्म।',
      $pro_en$
<h2>PG Proforma</h2>
<ol>
<li><a href="https://hau.ac.in/storage/app/uploads/Hg1ChoXQUdWyXmQ1WKkw9WxF1cJc3AxcKkHJbP2N.doc" target="_blank" rel="noopener noreferrer"><strong>PG-1.doc</strong></a> (Recommendations of Advisory Committee)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/Ip1UZK1i7jyQrCpKCnn6CCXe2aKyEtULFB68ugPZ.doc" target="_blank" rel="noopener noreferrer"><strong>PG-2.doc</strong></a> (Programme of Work)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/HndmRlymGd3sUYWRNmyKnJ3nMsyfEb0yx0WKFikp.doc" target="_blank" rel="noopener noreferrer"><strong>PG-3.doc</strong></a> (Submission of Synopsis)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/SbGAg3ZbthZfOsYu95DJHREdwBXWZY9PtYla7KvG.pdf" target="_blank" rel="noopener noreferrer"><strong>PG-4.pdf</strong></a> (Preliminary Written Examination)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/Uk66lgl9WhCvFOZ8hrLbU4lofXxEEQbF0jSEuITE.doc" target="_blank" rel="noopener noreferrer"><strong>PG-5A.doc</strong></a> (Preliminary Oral Examination Panel)</li>
<li><a href="https://www.hau.ac.in/storage/app/uploads/71ComFzqH6s3lzTCA8ZW5LltBl5H5x9ttQRYvHMK.pdf" target="_blank" rel="noopener noreferrer"><strong>PG-5B</strong></a> (External Examiner Panel)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/J9u8UW7F2O2WhsXSlLXRy2iCT7Ah080Rqu1UhKZx.doc" target="_blank" rel="noopener noreferrer"><strong>PG-6.doc</strong></a> (Certificate of Preliminary Examination Ph.D)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/5yzk1fW9xjbsNDGrTEA0rQS66u3Szd9yCyc7xp7J.doc" target="_blank" rel="noopener noreferrer"><strong>PG-7.doc</strong></a> (Report on the Preliminary Examination for the Final Examination)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/nOYVcp1FLMaM2beECscPQLFbIETAYZl27kVPVlS8.doc" target="_blank" rel="noopener noreferrer"><strong>PG-8.doc</strong></a> (Thesis Seminar Certificate)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/BcFjtKLSZotTneVBA7hQQ2jYQCnLGRdIUXJ3R5wi.doc" target="_blank" rel="noopener noreferrer"><strong>PG-9.doc</strong></a> (Thesis Submission Proforma)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/octfteOHScfTCbwDJzpWd1z77GWub3rPxsW2JRqB.doc" target="_blank" rel="noopener noreferrer"><strong>PG-10.doc</strong></a> (Certificate of Oral Examination)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/Px0T4LWWZ48utLeafl5yWH7RtT6iCAFe8oSdCQ5n.doc" target="_blank" rel="noopener noreferrer"><strong>I-Grade.doc</strong></a></li>
<li><a href="https://hau.ac.in/storage/app/uploads/UdUrfIol8arMZunMCdPA6ynKBOAYFHiD7qtfWy6v.doc" target="_blank" rel="noopener noreferrer"><strong>Instructor Report.doc</strong></a></li>
<li><a href="https://hau.ac.in/storage/app/uploads/cwxdS3FmMXbBWNxxOlsCJ8fBWUEByBNQqvO0bBs2.rtf" target="_blank" rel="noopener noreferrer"><strong>REMUNERATION TO EXAMINERS.doc</strong></a></li>
<li><a href="https://hau.ac.in/storage/app/uploads/skr5HYvBgCxMzxtg5pDwkrBOz7c6Bj5GhyUjoOnX.pdf" target="_blank" rel="noopener noreferrer"><strong>Plagiarism Verification Certificate.pdf</strong></a></li>
<li><a href="https://hau.ac.in/registration/pgs-registration" target="_blank" rel="noopener noreferrer"><strong>Apply online for attending Seminar/Workshop etc.</strong></a></li>
</ol>
$pro_en$,
      $pro_hi$
<h2>पीजी प्रपत्र</h2>
<p>नीचे दिए गए लिंक से पीजी प्रपत्र डाउनलोड करें।</p>
$pro_hi$,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', false, 'staff', false,
        'gallery', false, 'mainContent', true, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      2
    ),
    (
      'seminar-registration',
      'Seminar Registration',
      'सेमिनार पंजीकरण',
      'Online registration for PG seminars and workshops.',
      'पीजी सेमिनार और कार्यशालाओं के लिए ऑनलाइन पंजीकरण।',
      $sem_en$
<h2>Seminar Registration</h2>
<p>RA/SRF/JRF/M.Tech./Ph.D. students can apply online for attending seminars, workshops and related academic events.</p>
<p><a class="inline-flex rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white no-underline hover:bg-emerald-500" href="https://hau.ac.in/registration/pgs-registration" target="_blank" rel="noopener noreferrer">Apply online for Seminar Registration</a></p>
$sem_en$,
      $sem_hi$
<h2>सेमिनार पंजीकरण</h2>
<p>आरए/एसआरएफ/जेआरएफ/एम.टेक./पीएच.डी. छात्र सेमिनार और कार्यशालाओं हेतु ऑनलाइन आवेदन कर सकते हैं।</p>
<p><a href="https://hau.ac.in/registration/pgs-registration" target="_blank" rel="noopener noreferrer">ऑनलाइन पंजीकरण के लिए यहाँ क्लिक करें</a></p>
$sem_hi$,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', false, 'staff', false,
        'gallery', false, 'mainContent', true, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      3
    ),
    (
      'pg-studies-gallery',
      'Gallery',
      'गैलरी',
      'Photo gallery from Post Graduate Studies.',
      'स्नातकोत्तर अध्ययन की फोटो गैलरी।',
      NULL,
      NULL,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', false, 'staff', false,
        'gallery', true, 'mainContent', false, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      4
    ),
    (
      'pg-studies-contact',
      'Contact Us',
      'संपर्क करें',
      'Contact Post Graduate Studies office.',
      'स्नातकोत्तर अध्ययन कार्यालय से संपर्क करें।',
      NULL,
      NULL,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', true, 'staff', false,
        'gallery', false, 'mainContent', false, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      5
    )
) AS v(slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, layout_config, sort_order)
WHERE hub.slug = 'pg-studies'
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  title_en = EXCLUDED.title_en,
  title_hi = EXCLUDED.title_hi,
  excerpt_en = EXCLUDED.excerpt_en,
  excerpt_hi = EXCLUDED.excerpt_hi,
  content_en = EXCLUDED.content_en,
  content_hi = EXCLUDED.content_hi,
  layout_config = EXCLUDED.layout_config,
  sort_order = EXCLUDED.sort_order,
  status = 'published',
  published_at = COALESCE(ccshau_pages.published_at, now());

-- Gallery images
DELETE FROM ccshau_page_gallery_items
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'pg-studies-gallery');

INSERT INTO ccshau_page_gallery_items (
  page_id, image_url, thumbnail_url, title_en, title_hi, sort_order, is_active
)
SELECT p.id, v.image_url, v.thumbnail_url, v.title_en, v.title_hi, v.sort_order, true
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    ('https://hau.ac.in/public/images/college/banner/44/1624419644.jpg', 'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg', 'PG Studies Block', 'पीजी अध्ययन ब्लॉक', 1),
    ('https://hau.ac.in/public/images/college/banner/44/1624419644.jpg', 'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg', 'Campus', 'परिसर', 2)
) AS v(image_url, thumbnail_url, title_en, title_hi, sort_order)
WHERE p.slug = 'pg-studies-gallery';


-- #############################################################################
-- Migration: 20260707130000_directorate_type_b.sql
-- #############################################################################

-- Type B directorates: self-root college microsites + college_root_id trigger fix

-- Standalone college roots (directorates) must set college_root_id = self on insert.
CREATE OR REPLACE FUNCTION ccshau_set_page_college_root_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_root uuid;
  v_parent_slug text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.page_type = 'college' THEN
      IF NEW.parent_id IS NULL THEN
        NEW.college_root_id := NEW.id;
        RETURN NEW;
      END IF;

      SELECT slug INTO v_parent_slug FROM ccshau_pages WHERE id = NEW.parent_id;
      IF v_parent_slug = 'colleges' THEN
        NEW.college_root_id := NEW.id;
        RETURN NEW;
      END IF;
    END IF;

    IF NEW.parent_id IS NOT NULL THEN
      SELECT college_root_id INTO v_root FROM ccshau_pages WHERE id = NEW.parent_id;
      IF v_root IS NOT NULL THEN
        NEW.college_root_id := v_root;
        RETURN NEW;
      END IF;

      SELECT p.college_root_id INTO v_root
      FROM ccshau_pages child
      JOIN ccshau_pages p ON p.id = child.parent_id
      WHERE child.id = NEW.parent_id AND p.page_type = 'college';

      IF v_root IS NOT NULL THEN
        NEW.college_root_id := v_root;
        RETURN NEW;
      END IF;
    END IF;
  END IF;

  v_root := ccshau_resolve_college_root_id(NEW.id);
  IF v_root IS NOT NULL THEN
    NEW.college_root_id := v_root;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill self-root for any college page missing college_root_id.
UPDATE ccshau_pages p
SET college_root_id = p.id
WHERE p.page_type = 'college'
  AND p.college_root_id IS NULL
  AND (
    p.parent_id IS NULL
    OR EXISTS (
      SELECT 1 FROM ccshau_pages parent
      WHERE parent.id = p.parent_id AND parent.slug = 'colleges'
    )
  );

-- Promote directorate stubs to Type B college microsites (public URL /college/{slug}).
UPDATE ccshau_pages
SET
  page_type = 'college',
  layout_template = 'college_home',
  layout_config = jsonb_build_object(
    'hero', true,
    'headOfficer', true,
    'contacts', true,
    'staff', false,
    'gallery', false,
    'newsTicker', false,
    'studentCorner', false,
    'mainContent', true,
    'leftSidebar', false,
    'rightSidebar', false,
    'collegeTopMenu', true,
    'farmersCta', false,
    'heroContactButton', true
  ),
  office_cta_enabled = false,
  college_root_id = id
WHERE slug IN (
  'directorate-of-research',
  'directorate-of-extension-education',
  'directorate-of-students-welfare'
)
AND page_type <> 'college';
