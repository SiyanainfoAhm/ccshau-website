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
