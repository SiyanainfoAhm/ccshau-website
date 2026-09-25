-- Soft-delete for CMS pages and faculty assignments.
-- Rows stay in the database; the site and admin hide is_deleted = true.

ALTER TABLE ccshau_pages
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

ALTER TABLE ccshau_faculty_assignments
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ccshau_idx_pages_not_deleted
  ON ccshau_pages (updated_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS ccshau_idx_faculty_assignments_not_deleted
  ON ccshau_faculty_assignments (page_id, sort_order)
  WHERE is_deleted = false;

-- Keep slugs reusable after a soft delete. Active rows stay unique.
ALTER TABLE ccshau_pages DROP CONSTRAINT IF EXISTS ccshau_pages_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS ccshau_pages_slug_active_key
  ON ccshau_pages (slug)
  WHERE is_deleted = false;

ALTER TABLE ccshau_faculty_assignments
  DROP CONSTRAINT IF EXISTS ccshau_faculty_assignments_page_person_key;
CREATE UNIQUE INDEX IF NOT EXISTS ccshau_faculty_assignments_page_person_active_key
  ON ccshau_faculty_assignments (page_id, person_id)
  WHERE is_deleted = false;

DROP INDEX IF EXISTS ccshau_idx_faculty_assignments_page_slug;
CREATE UNIQUE INDEX ccshau_idx_faculty_assignments_page_slug
  ON ccshau_faculty_assignments (page_id, staff_slug)
  WHERE staff_slug IS NOT NULL AND is_deleted = false;
