-- College page gallery items (legacy hau.ac.in college gallery albums)
-- Source: https://www.hau.ac.in/college/gallery/college-of-agriculture-hisar (album 95)

CREATE TABLE IF NOT EXISTS ccshau_page_gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  image_url text NOT NULL,
  thumbnail_url text,
  title_en text,
  title_hi text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_page_gallery_items IS 'CCSHAU_ image gallery items for college section pages';

CREATE INDEX IF NOT EXISTS ccshau_idx_page_gallery_items_page
  ON ccshau_page_gallery_items (page_id, sort_order);

CREATE TRIGGER ccshau_trg_page_gallery_items_updated_at
  BEFORE UPDATE ON ccshau_page_gallery_items
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_page_gallery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ccshau_pol_page_gallery_items_select_active ON ccshau_page_gallery_items;
CREATE POLICY ccshau_pol_page_gallery_items_select_active
  ON ccshau_page_gallery_items FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM ccshau_pages p
      WHERE p.id = page_id AND p.status = 'published'
    )
  );

DROP POLICY IF EXISTS ccshau_pol_page_gallery_items_select_authenticated ON ccshau_page_gallery_items;
CREATE POLICY ccshau_pol_page_gallery_items_select_authenticated
  ON ccshau_page_gallery_items FOR SELECT TO authenticated USING (true);

UPDATE ccshau_pages
SET
  title_hi = 'गैलरी',
  excerpt_en = 'Photo gallery from College of Agriculture, Hisar.',
  excerpt_hi = 'हिसार कृषि महाविद्यालय की फोटो गैलरी।',
  content_en = NULL,
  layout_config = jsonb_build_object(
    'hero', false,
    'headOfficer', false,
    'contacts', false,
    'staff', false,
    'gallery', true,
    'leftSidebar', false,
    'rightSidebar', false,
    'mainContent', false,
    'farmersCta', false,
    'collegeTopMenu', true,
    'heroContactButton', false
  )
WHERE slug = 'hisar-gallery';

DELETE FROM ccshau_page_gallery_items
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'hisar-gallery');

INSERT INTO ccshau_page_gallery_items (
  page_id, image_url, thumbnail_url, title_en, title_hi, sort_order
)
SELECT p.id, v.image_url, v.thumbnail_url, v.title_en, v.title_hi, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    ('https://www.hau.ac.in/public/images/gallery/images/1664/16867154740.jpg', 'https://www.hau.ac.in/public/images/gallery/images/1664/16867154740_thumb.jpg', 'Images', 'छवियाँ', 1),
    ('https://www.hau.ac.in/public/images/gallery/images/1665/16867154930.JPG', 'https://www.hau.ac.in/public/images/gallery/images/1665/16867154930_thumb.JPG', 'Images', 'छवियाँ', 2),
    ('https://www.hau.ac.in/public/images/gallery/images/1666/16867155080.JPG', 'https://www.hau.ac.in/public/images/gallery/images/1666/16867155080_thumb.JPG', 'Images', 'छवियाँ', 3),
    ('https://www.hau.ac.in/public/images/gallery/images/1667/16867155210.JPG', 'https://www.hau.ac.in/public/images/gallery/images/1667/16867155210_thumb.JPG', 'Images', 'छवियाँ', 4),
    ('https://www.hau.ac.in/public/images/gallery/images/1668/16867155340.jpg', 'https://www.hau.ac.in/public/images/gallery/images/1668/16867155340_thumb.jpg', 'Images', 'छवियाँ', 5),
    ('https://www.hau.ac.in/public/images/gallery/images/1669/16867155490.jpg', 'https://www.hau.ac.in/public/images/gallery/images/1669/16867155490_thumb.jpg', 'Images', 'छवियाँ', 6),
    ('https://www.hau.ac.in/public/images/gallery/images/1670/16868007910.jpg', 'https://www.hau.ac.in/public/images/gallery/images/1670/16868007910_thumb.jpg', 'Images', 'छवियाँ', 7),
    ('https://www.hau.ac.in/public/images/gallery/images/2198/17156656820.jpeg', 'https://www.hau.ac.in/public/images/gallery/images/2198/17156656820_thumb.jpeg', 'Images', 'छवियाँ', 8),
    ('https://www.hau.ac.in/public/images/gallery/images/2199/17156656980.jpeg', 'https://www.hau.ac.in/public/images/gallery/images/2199/17156656980_thumb.jpeg', 'Images', 'छवियाँ', 9),
    ('https://www.hau.ac.in/public/images/gallery/images/2200/17156657110.jpeg', 'https://www.hau.ac.in/public/images/gallery/images/2200/17156657110_thumb.jpeg', 'Images', 'छवियाँ', 10),
    ('https://www.hau.ac.in/public/images/gallery/images/2201/17156657250.jpeg', 'https://www.hau.ac.in/public/images/gallery/images/2201/17156657250_thumb.jpeg', 'Images', 'छवियाँ', 11),
    ('https://www.hau.ac.in/public/images/gallery/images/2202/17156657480.jpeg', 'https://www.hau.ac.in/public/images/gallery/images/2202/17156657480_thumb.jpeg', 'Images', 'छवियाँ', 12),
    ('https://www.hau.ac.in/public/images/gallery/images/2203/17156657860.jpeg', 'https://www.hau.ac.in/public/images/gallery/images/2203/17156657860_thumb.jpeg', 'Images', 'छवियाँ', 13)
) AS v(image_url, thumbnail_url, title_en, title_hi, sort_order)
WHERE p.slug = 'hisar-gallery';
