-- Circular section categories (legacy office + branch tabs) and circular linkage.

CREATE TABLE IF NOT EXISTS ccshau_circular_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id integer UNIQUE,
  name_en text NOT NULL,
  name_hi text,
  slug text NOT NULL,
  parent_id uuid REFERENCES ccshau_circular_categories (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_circular_categories IS 'CCSHAU_ circular section offices and branches (legacy hau_circular)';

CREATE UNIQUE INDEX IF NOT EXISTS ccshau_idx_circular_categories_root_slug
  ON ccshau_circular_categories (slug)
  WHERE parent_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ccshau_idx_circular_categories_child_slug
  ON ccshau_circular_categories (parent_id, slug)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ccshau_idx_circular_categories_parent
  ON ccshau_circular_categories (parent_id);

CREATE INDEX IF NOT EXISTS ccshau_idx_circular_categories_sort
  ON ccshau_circular_categories (parent_id, sort_order);

DROP TRIGGER IF EXISTS ccshau_trg_circular_categories_updated_at ON ccshau_circular_categories;
CREATE TRIGGER ccshau_trg_circular_categories_updated_at
  BEFORE UPDATE ON ccshau_circular_categories
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_circulars
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES ccshau_circular_categories (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legacy_notification_id integer;

COMMENT ON COLUMN ccshau_circulars.category_id IS 'Office/branch tab under Circular Section';
COMMENT ON COLUMN ccshau_circulars.legacy_notification_id IS 'Idempotent key from hau_circular_notifications.id';

CREATE UNIQUE INDEX IF NOT EXISTS ccshau_idx_circulars_legacy_notification_id
  ON ccshau_circulars (legacy_notification_id)
  WHERE legacy_notification_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ccshau_idx_circulars_category_id
  ON ccshau_circulars (category_id);

ALTER TABLE ccshau_circular_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ccshau_pol_circular_categories_select_anon ON ccshau_circular_categories;
CREATE POLICY ccshau_pol_circular_categories_select_anon
  ON ccshau_circular_categories FOR SELECT TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS ccshau_pol_circular_categories_select_authenticated ON ccshau_circular_categories;
CREATE POLICY ccshau_pol_circular_categories_select_authenticated
  ON ccshau_circular_categories FOR SELECT TO authenticated
  USING (true);
