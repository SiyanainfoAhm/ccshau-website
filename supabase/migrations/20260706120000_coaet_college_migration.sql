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
