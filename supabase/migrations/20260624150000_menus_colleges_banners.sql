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
