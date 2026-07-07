-- Per-page student corner link items (static link panel on college pages)

CREATE TABLE IF NOT EXISTS ccshau_page_student_corner_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  title_en text NOT NULL,
  title_hi text,
  href text,
  file_path text,
  expires_at timestamptz,
  is_new boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_page_student_corner_items IS 'CCSHAU_ student corner links for configurable college pages';

CREATE INDEX IF NOT EXISTS ccshau_idx_page_student_corner_items_page
  ON ccshau_page_student_corner_items (page_id, sort_order);

CREATE INDEX IF NOT EXISTS ccshau_idx_page_student_corner_items_expires
  ON ccshau_page_student_corner_items (expires_at)
  WHERE expires_at IS NOT NULL;

CREATE TRIGGER ccshau_trg_page_student_corner_items_updated_at
  BEFORE UPDATE ON ccshau_page_student_corner_items
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_page_student_corner_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ccshau_pol_page_student_corner_items_select_active ON ccshau_page_student_corner_items;
CREATE POLICY ccshau_pol_page_student_corner_items_select_active
  ON ccshau_page_student_corner_items FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM ccshau_pages p
      WHERE p.id = page_id AND p.status = 'published'
    )
  );

DROP POLICY IF EXISTS ccshau_pol_page_student_corner_items_select_authenticated ON ccshau_page_student_corner_items;
CREATE POLICY ccshau_pol_page_student_corner_items_select_authenticated
  ON ccshau_page_student_corner_items FOR SELECT TO authenticated USING (true);
