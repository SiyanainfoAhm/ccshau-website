-- Add University Admin and Reviewer/Approver CMS roles

DO $$ BEGIN
  ALTER TYPE ccshau_user_role ADD VALUE 'university_admin';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE ccshau_user_role ADD VALUE 'reviewer';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE ccshau_user_role IS
  'CMS roles: super_admin, university_admin, dept_admin, editor, reviewer, viewer';
