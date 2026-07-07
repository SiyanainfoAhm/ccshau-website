-- =============================================================================
-- PG Seminar / Workshop registration submissions
-- Legacy form: https://hau.ac.in/registration/pgs-registration
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE ccshau_pg_seminar_registration_status AS ENUM (
    'submitted',
    'under_review',
    'approved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ccshau_pg_seminar_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number text NOT NULL UNIQUE,
  student_name text NOT NULL,
  admission_number text NOT NULL,
  department text,
  student_degree text,
  gender text CHECK (gender IN ('male', 'female')),
  category text CHECK (category IN ('SC', 'ST', 'OBC', 'PH', 'GEN')),
  is_foreigner boolean,
  country_name text,
  seminar_title text,
  duration_from date NOT NULL,
  duration_to date NOT NULL,
  source_of_advertisement text,
  organizing_institute_address text,
  paper_status text[] NOT NULL DEFAULT '{}',
  last_submission_date date,
  seminars_attended_last_two_years text,
  is_relevant_to_subject boolean,
  funds_from_outside_agency boolean,
  registration_fee numeric(12, 2),
  travel_grant numeric(12, 2),
  total_liability numeric(12, 2),
  outside_funding_full_payment text,
  outside_funding_partial_payment text,
  funding_agency_name text,
  combined_with_other_purpose boolean,
  other_relevant_info text,
  status ccshau_pg_seminar_registration_status NOT NULL DEFAULT 'submitted',
  admin_remarks text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ccshau_pg_seminar_duration_check CHECK (duration_to >= duration_from)
);

COMMENT ON TABLE ccshau_pg_seminar_registrations IS 'CCSHAU_ PG seminar/workshop registration form submissions';

CREATE INDEX IF NOT EXISTS ccshau_idx_pg_seminar_reg_status
  ON ccshau_pg_seminar_registrations (status);

CREATE INDEX IF NOT EXISTS ccshau_idx_pg_seminar_reg_created_at
  ON ccshau_pg_seminar_registrations (created_at DESC);

CREATE INDEX IF NOT EXISTS ccshau_idx_pg_seminar_reg_admission
  ON ccshau_pg_seminar_registrations (admission_number);

CREATE TRIGGER ccshau_trg_pg_seminar_registrations_updated_at
  BEFORE UPDATE ON ccshau_pg_seminar_registrations
  FOR EACH ROW
  EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_pg_seminar_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_pg_seminar_reg_insert_anon
  ON ccshau_pg_seminar_registrations FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY ccshau_pol_pg_seminar_reg_select_authenticated
  ON ccshau_pg_seminar_registrations FOR SELECT TO authenticated
  USING (true);

-- Replace external link placeholder with on-page form
UPDATE ccshau_pages
SET
  content_en = NULL,
  content_hi = NULL,
  excerpt_en = 'Online application form for attending Seminar/Workshop etc. for RA/SRF/JRF/M.Tech./Ph.D students.',
  excerpt_hi = 'आरए/एसआरएफ/जेआरएफ/एम.टेक./पीएच.डी. छात्रों के लिए सेमिनार/कार्यशाला हेतु ऑनलाइन आवेदन पत्र।'
WHERE slug = 'seminar-registration';
