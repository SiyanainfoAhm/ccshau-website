-- Office portal layout for administrative college pages (e.g. Registrar Office)

DO $$ BEGIN
  CREATE TYPE ccshau_layout_template AS ENUM ('college_home', 'office_portal', 'standard');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE ccshau_pages
  ADD COLUMN IF NOT EXISTS layout_template ccshau_layout_template NOT NULL DEFAULT 'college_home',
  ADD COLUMN IF NOT EXISTS head_name_en text,
  ADD COLUMN IF NOT EXISTS head_name_hi text,
  ADD COLUMN IF NOT EXISTS head_role_en text,
  ADD COLUMN IF NOT EXISTS head_role_hi text,
  ADD COLUMN IF NOT EXISTS head_image_path text,
  ADD COLUMN IF NOT EXISTS office_cta_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN ccshau_pages.layout_template IS 'Public layout: college_home, office_portal (sidebar office), standard';
COMMENT ON COLUMN ccshau_pages.head_name_en IS 'Office portal — head officer name (EN)';
COMMENT ON COLUMN ccshau_pages.head_role_en IS 'Office portal — head officer role/titles (EN); separate lines with newline';
COMMENT ON COLUMN ccshau_pages.office_cta_enabled IS 'Office portal — show farmers portal CTA band';

CREATE TABLE IF NOT EXISTS ccshau_page_contact_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  label_en text NOT NULL,
  label_hi text,
  value_en text NOT NULL,
  value_hi text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ccshau_page_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_hi text,
  designation_en text NOT NULL,
  designation_hi text,
  specialization_en text,
  specialization_hi text,
  image_path text,
  detail_href text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ccshau_page_sidebar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('left', 'right')),
  label_en text NOT NULL,
  label_hi text,
  href text,
  linked_page_id uuid REFERENCES ccshau_pages (id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_page_contact_lines IS 'CCSHAU_ structured contact block on office portal pages';
COMMENT ON TABLE ccshau_page_staff IS 'CCSHAU_ staff directory rows on office portal pages';
COMMENT ON TABLE ccshau_page_sidebar_items IS 'CCSHAU_ per-page left/right quick link sidebars';

CREATE INDEX IF NOT EXISTS ccshau_idx_page_contact_lines_page
  ON ccshau_page_contact_lines (page_id, sort_order);
CREATE INDEX IF NOT EXISTS ccshau_idx_page_staff_page
  ON ccshau_page_staff (page_id, sort_order);
CREATE INDEX IF NOT EXISTS ccshau_idx_page_sidebar_items_page
  ON ccshau_page_sidebar_items (page_id, side, sort_order);

CREATE TRIGGER ccshau_trg_page_contact_lines_updated_at
  BEFORE UPDATE ON ccshau_page_contact_lines
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TRIGGER ccshau_trg_page_staff_updated_at
  BEFORE UPDATE ON ccshau_page_staff
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TRIGGER ccshau_trg_page_sidebar_items_updated_at
  BEFORE UPDATE ON ccshau_page_sidebar_items
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_page_contact_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_page_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_page_sidebar_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_page_contact_lines_select_active
  ON ccshau_page_contact_lines FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM ccshau_pages p
      WHERE p.id = page_id AND p.status = 'published'
    )
  );

CREATE POLICY ccshau_pol_page_staff_select_active
  ON ccshau_page_staff FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM ccshau_pages p
      WHERE p.id = page_id AND p.status = 'published'
    )
  );

CREATE POLICY ccshau_pol_page_sidebar_items_select_active
  ON ccshau_page_sidebar_items FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM ccshau_pages p
      WHERE p.id = page_id AND p.status = 'published'
    )
  );

CREATE POLICY ccshau_pol_page_contact_lines_select_authenticated
  ON ccshau_page_contact_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_page_staff_select_authenticated
  ON ccshau_page_staff FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_page_sidebar_items_select_authenticated
  ON ccshau_page_sidebar_items FOR SELECT TO authenticated USING (true);

-- Registrar Office (legacy https://hau.ac.in/college/registrar-office)

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi,
  page_type, layout_template, status, published_at,
  head_name_en, head_name_hi, head_role_en, head_role_hi, head_image_path,
  featured_image_path, office_cta_enabled
)
VALUES (
  'registrar-office',
  'Registrar Office',
  'कुलसचिव कार्यालय',
  'Registrar Office of CCS Haryana Agricultural University, Hisar.',
  'चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार का कुलसचिव कार्यालय।',
  'college',
  'office_portal',
  'published',
  now(),
  'Dr. Pawan Kumar',
  'डॉ. पवन कुमार',
  E'Registrar' || E'\n' || 'Chief Vigilance Officer',
  E'कुलसचिव' || E'\n' || 'मुख्य सतर्कता अधिकारी',
  'https://hau.ac.in/storage/app/uploads/qMTteJ1Y5WaYgqNs1InqlrKemUdJtMbX0jSszoLD.jpeg',
  'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  title_en = EXCLUDED.title_en,
  title_hi = EXCLUDED.title_hi,
  page_type = 'college',
  layout_template = 'office_portal',
  status = 'published',
  head_name_en = EXCLUDED.head_name_en,
  head_name_hi = EXCLUDED.head_name_hi,
  head_role_en = EXCLUDED.head_role_en,
  head_role_hi = EXCLUDED.head_role_hi,
  head_image_path = EXCLUDED.head_image_path,
  featured_image_path = EXCLUDED.featured_image_path,
  office_cta_enabled = true;

INSERT INTO ccshau_page_contact_lines (page_id, label_en, label_hi, value_en, value_hi, sort_order)
SELECT p.id, v.label_en, v.label_hi, v.value_en, v.value_hi, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'Query Regarding Admission',
      'प्रवेश संबंधी पूछताछ',
      'Office : +91 1662 255271, 255254',
      'कार्यालय : +91 1662 255271, 255254',
      1
    ),
    (
      'Query Regarding Recruitment',
      'भर्ती संबंधी पूछताछ',
      'Office : +91 1662 255224, 255154',
      'कार्यालय : +91 1662 255224, 255154',
      2
    ),
    (
      'Office',
      'कार्यालय',
      'Office : +91 1662 234613, +91 1662 255284, +91 1662 255294',
      'कार्यालय : +91 1662 234613, +91 1662 255284, +91 1662 255294',
      3
    ),
    ('Fax', 'फैक्स', 'Fax : +91 1662 284358', 'फैक्स : +91 1662 284358', 4),
    ('E-mail', 'ई-मेल', 'E-mail : regi@hau.ac.in', 'ई-मेल : regi@hau.ac.in', 5)
) AS v(label_en, label_hi, value_en, value_hi, sort_order)
WHERE p.slug = 'registrar-office'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_page_contact_lines c WHERE c.page_id = p.id LIMIT 1
  );

INSERT INTO ccshau_page_sidebar_items (page_id, side, label_en, label_hi, href, sort_order)
SELECT p.id, v.side, v.label_en, v.label_hi, v.href, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    ('left', 'Home', 'होम', '/college/registrar-office', 1),
    ('left', 'Academic Branch', 'शैक्षणिक शाखा', '/college/registrar-office/academic-branch', 2),
    ('left', 'Controller of Examination', 'परीक्षा नियंत्रक', '/college/registrar-office/controller-of-examination', 3),
    ('left', 'Establishment/Employees Branch', 'स्थापना/कर्मचारी शाखा', '/college/registrar-office/establishment-employees-branch', 4),
    ('left', 'Faculty Branch', 'संकाय शाखा', '/college/registrar-office/faculty-branch', 5),
    ('left', 'General Branch', 'सामान्य शाखा', '/college/registrar-office/general-branch', 6),
    ('left', 'Legal Cell', 'कानूनी प्रकोष्ठ', '/college/registrar-office/legal-cell', 7),
    ('left', 'Recruitment Branch', 'भर्ती शाखा', '/college/registrar-office/recruitment-branch', 8),
    ('right', 'University Home', 'विश्वविद्यालय होम', '/', 1),
    ('right', 'Contact Us', 'संपर्क करें', '/contact', 2),
    ('right', 'Tenders', 'निविदाएं', '/tenders', 3),
    ('right', 'Downloads', 'डाउनलोड', '/downloads', 4)
) AS v(side, label_en, label_hi, href, sort_order)
WHERE p.slug = 'registrar-office'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_page_sidebar_items s WHERE s.page_id = p.id LIMIT 1
  );

-- Branch child pages (placeholders — admin can enrich content)
INSERT INTO ccshau_pages (
  slug, title_en, title_hi, parent_id, page_type, layout_template, status, published_at, office_cta_enabled
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  parent.id,
  'college',
  'office_portal',
  'published',
  now(),
  true
FROM ccshau_pages parent
CROSS JOIN (
  VALUES
    ('academic-branch', 'Academic Branch', 'शैक्षणिक शाखा'),
    ('controller-of-examination', 'Controller of Examination', 'परीक्षा नियंत्रक'),
    ('establishment-employees-branch', 'Establishment/Employees Branch', 'स्थापना/कर्मचारी शाखा'),
    ('faculty-branch', 'Faculty Branch', 'संकाय शाखा'),
    ('general-branch', 'General Branch', 'सामान्य शाखा'),
    ('legal-cell', 'Legal Cell', 'कानूनी प्रकोष्ठ'),
    ('recruitment-branch', 'Recruitment Branch', 'भर्ती शाखा')
) AS v(slug, title_en, title_hi)
WHERE parent.slug = 'registrar-office'
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  page_type = 'college',
  layout_template = 'office_portal',
  status = 'published',
  office_cta_enabled = true;

-- Copy sidebar quick links to branch pages (inherit same left menu)
INSERT INTO ccshau_page_sidebar_items (page_id, side, label_en, label_hi, href, sort_order)
SELECT child.id, s.side, s.label_en, s.label_hi, s.href, s.sort_order
FROM ccshau_pages parent
JOIN ccshau_pages child ON child.parent_id = parent.id
JOIN ccshau_page_sidebar_items s ON s.page_id = parent.id
WHERE parent.slug = 'registrar-office'
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_page_sidebar_items x WHERE x.page_id = child.id LIMIT 1
  );
