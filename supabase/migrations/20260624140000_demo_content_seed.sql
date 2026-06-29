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
