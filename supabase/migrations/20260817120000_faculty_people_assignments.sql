-- Phase 3: shared faculty people + per-page assignments (additive; keep ccshau_page_staff).
-- Public reads stay on page_staff until a college id is listed in
-- ccshau_site_settings.faculty_people_public_college_ids (pilot: College of Agriculture, Hisar).

ALTER TABLE ccshau_site_settings
  ADD COLUMN IF NOT EXISTS faculty_people_public_college_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN ccshau_site_settings.faculty_people_public_college_ids IS
  'College root page ids whose public Faculty lists/profiles read from people+assignments instead of page_staff copies.';

UPDATE ccshau_site_settings
SET faculty_people_public_college_ids = ARRAY(
  SELECT DISTINCT x
  FROM unnest(
    coalesce(faculty_people_public_college_ids, '{}'::uuid[])
    || ARRAY['555239b2-bc8f-468b-82da-4592879e865b'::uuid]
  ) AS x
)
WHERE id = 1;

CREATE TABLE IF NOT EXISTS ccshau_faculty_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_slug text NOT NULL,
  name_en text NOT NULL,
  name_hi text,
  image_path text,
  email text,
  mobile text,
  qualification_en text,
  qualification_hi text,
  experience_en text,
  experience_hi text,
  specialization_en text,
  specialization_hi text,
  detail_content_en text,
  detail_content_hi text,
  legacy_user_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ccshau_faculty_people_global_slug_key UNIQUE (global_slug),
  CONSTRAINT ccshau_faculty_people_legacy_user_id_key UNIQUE (legacy_user_id)
);

COMMENT ON TABLE ccshau_faculty_people IS 'CCSHAU_ one shared faculty/staff person profile (photo, contact, Other Activities)';
COMMENT ON COLUMN ccshau_faculty_people.specialization_en IS 'Shared default specialization; assignment may override';
COMMENT ON COLUMN ccshau_faculty_people.legacy_user_id IS 'Legacy hau.ac.in user id when staff_slug is legacy-user-{id}';

CREATE INDEX IF NOT EXISTS ccshau_idx_faculty_people_email_lower
  ON ccshau_faculty_people (lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS ccshau_faculty_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES ccshau_faculty_people (id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  source_staff_id uuid REFERENCES ccshau_page_staff (id) ON DELETE SET NULL,
  designation_en text NOT NULL,
  designation_hi text,
  specialization_en text,
  specialization_hi text,
  member_type ccshau_staff_member_type NOT NULL DEFAULT 'faculty',
  staff_slug text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ccshau_faculty_assignments_page_person_key UNIQUE (page_id, person_id)
);

COMMENT ON TABLE ccshau_faculty_assignments IS 'CCSHAU_ faculty placement on a department/station/office page; designation is local';
COMMENT ON COLUMN ccshau_faculty_assignments.specialization_en IS 'Optional per-page override; null means use person default';
COMMENT ON COLUMN ccshau_faculty_assignments.staff_slug IS 'Public URL slug on this page (keeps old /faculty/{slug} links)';
COMMENT ON COLUMN ccshau_faculty_assignments.source_staff_id IS 'Dual-write link to the temporary page_staff copy';

CREATE UNIQUE INDEX IF NOT EXISTS ccshau_idx_faculty_assignments_source_staff
  ON ccshau_faculty_assignments (source_staff_id)
  WHERE source_staff_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ccshau_idx_faculty_assignments_page_slug
  ON ccshau_faculty_assignments (page_id, staff_slug)
  WHERE staff_slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ccshau_idx_faculty_assignments_one_hod
  ON ccshau_faculty_assignments (page_id)
  WHERE member_type = 'hod' AND is_active = true;

CREATE INDEX IF NOT EXISTS ccshau_idx_faculty_assignments_page
  ON ccshau_faculty_assignments (page_id, sort_order);

CREATE INDEX IF NOT EXISTS ccshau_idx_faculty_assignments_person
  ON ccshau_faculty_assignments (person_id);

CREATE TRIGGER ccshau_trg_faculty_people_updated_at
  BEFORE UPDATE ON ccshau_faculty_people
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TRIGGER ccshau_trg_faculty_assignments_updated_at
  BEFORE UPDATE ON ccshau_faculty_assignments
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_faculty_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_faculty_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_faculty_people_select_active
  ON ccshau_faculty_people FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY ccshau_pol_faculty_people_select_authenticated
  ON ccshau_faculty_people FOR SELECT TO authenticated
  USING (true);

CREATE POLICY ccshau_pol_faculty_assignments_select_active
  ON ccshau_faculty_assignments FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM ccshau_pages p
      WHERE p.id = page_id AND p.status = 'published'
    )
  );

CREATE POLICY ccshau_pol_faculty_assignments_select_authenticated
  ON ccshau_faculty_assignments FOR SELECT TO authenticated
  USING (true);
