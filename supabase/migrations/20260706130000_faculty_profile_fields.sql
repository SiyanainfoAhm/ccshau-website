-- Extended faculty/staff profile fields for department directory + detail pages.

DO $$ BEGIN
  CREATE TYPE ccshau_staff_member_type AS ENUM ('hod', 'faculty');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE ccshau_page_staff
  ADD COLUMN IF NOT EXISTS member_type ccshau_staff_member_type NOT NULL DEFAULT 'faculty',
  ADD COLUMN IF NOT EXISTS staff_slug text,
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS experience_en text,
  ADD COLUMN IF NOT EXISTS experience_hi text,
  ADD COLUMN IF NOT EXISTS detail_content_en text,
  ADD COLUMN IF NOT EXISTS detail_content_hi text;

COMMENT ON COLUMN ccshau_page_staff.member_type IS 'hod = Head of Department; faculty = regular faculty row';
COMMENT ON COLUMN ccshau_page_staff.staff_slug IS 'URL slug for public faculty detail page within department';
COMMENT ON COLUMN ccshau_page_staff.detail_content_en IS 'Full HTML profile (education, publications, etc.)';

CREATE UNIQUE INDEX IF NOT EXISTS ccshau_idx_page_staff_page_slug
  ON ccshau_page_staff (page_id, staff_slug)
  WHERE staff_slug IS NOT NULL;
