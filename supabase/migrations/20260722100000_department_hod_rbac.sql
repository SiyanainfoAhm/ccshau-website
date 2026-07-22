-- Department HOD RBAC: one user manages exactly one college department page.

DO $$ BEGIN
  CREATE TYPE ccshau_department_page_role AS ENUM ('dept_hod');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ccshau_user_department_pages (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  department_page_id uuid NOT NULL REFERENCES ccshau_pages (id) ON DELETE CASCADE,
  role ccshau_department_page_role NOT NULL DEFAULT 'dept_hod',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ccshau_user_department_pages IS
  'Maps each Department HOD CMS user to exactly one college department page (office_portal).';

CREATE INDEX IF NOT EXISTS ccshau_idx_user_department_pages_page_id
  ON ccshau_user_department_pages (department_page_id);

CREATE TRIGGER ccshau_trg_user_department_pages_updated_at
  BEFORE UPDATE ON ccshau_user_department_pages
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_user_department_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_user_department_pages_select_authenticated
  ON ccshau_user_department_pages FOR SELECT TO authenticated
  USING (true);
