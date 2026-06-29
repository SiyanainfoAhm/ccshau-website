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
