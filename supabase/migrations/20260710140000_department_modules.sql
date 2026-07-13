-- Phase A: Department / section → CMS module permissions matrix.

DO $$ BEGIN
  CREATE TYPE ccshau_cms_module AS ENUM (
    'pages',
    'news',
    'circulars',
    'tenders',
    'downloads',
    'media',
    'feedback'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ccshau_department_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES ccshau_departments (id) ON DELETE CASCADE,
  module ccshau_cms_module NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, module)
);

COMMENT ON TABLE ccshau_department_modules IS
  'CCSHAU_ Allowed CMS modules per department/section. Empty = unrestricted (legacy depts).';

CREATE INDEX IF NOT EXISTS ccshau_idx_department_modules_department
  ON ccshau_department_modules (department_id);

ALTER TABLE ccshau_department_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_department_modules_select
  ON ccshau_department_modules FOR SELECT TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- Seed office / section departments (RFP examples)
-- ---------------------------------------------------------------------------

INSERT INTO ccshau_departments (slug, name_en, name_hi, sort_order) VALUES
  ('purchase-tender', 'Purchase / Tender Section', 'खरीद / निविदा अनुभाग', 10),
  ('pro-media', 'PRO / Media Section', 'जनसंपर्क / मीडिया अनुभाग', 11),
  ('admin-section', 'Admin Section', 'प्रशासन अनुभाग', 12),
  ('agriculture-department', 'Agriculture Department', 'कृषि विभाग', 13)
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_hi = EXCLUDED.name_hi,
  sort_order = EXCLUDED.sort_order;

-- Purchase / Tender → tenders only
INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('tenders')) AS m(module)
WHERE d.slug = 'purchase-tender'
ON CONFLICT (department_id, module) DO NOTHING;

-- PRO / Media → news + media (press releases, photos, videos)
INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('news'), ('media')) AS m(module)
WHERE d.slug = 'pro-media'
ON CONFLICT (department_id, module) DO NOTHING;

-- Admin Section → circulars + news (official notices)
INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('circulars'), ('news')) AS m(module)
WHERE d.slug = 'admin-section'
ON CONFLICT (department_id, module) DO NOTHING;

-- Agriculture Department → pages, notices, documents, gallery
INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('pages'), ('news'), ('downloads'), ('media')) AS m(module)
WHERE d.slug = 'agriculture-department'
ON CONFLICT (department_id, module) DO NOTHING;
