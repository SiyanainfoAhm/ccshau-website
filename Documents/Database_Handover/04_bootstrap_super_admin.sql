-- =============================================================================
-- CCSHAU — bootstrap first Super Admin (TEMPLATE)
-- =============================================================================
-- Steps:
--   1. Create a user in Supabase Dashboard → Authentication → Users
--      (email + password), OR use invite/signup.
--   2. Copy that user's UUID from Auth → Users.
--   3. Replace the placeholders below and run this script.
-- =============================================================================

-- PLACEHOLDERS — replace before running:
--   :user_id  → Auth user UUID
--   :email    → same email as Auth user
--   :name     → display name

DO $$
DECLARE
  v_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- <-- REPLACE
  v_email   text := 'admin@example.com';                     -- <-- REPLACE
  v_name    text := 'Super Admin';                           -- <-- REPLACE
BEGIN
  IF v_user_id = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION 'Replace v_user_id with the Auth user UUID before running.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Auth user % not found. Create the user in Authentication first.', v_user_id;
  END IF;

  INSERT INTO ccshau_profiles (id, display_name, email, is_active)
  VALUES (v_user_id, v_name, v_email, true)
  ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        email = EXCLUDED.email,
        is_active = true,
        updated_at = now();

  INSERT INTO ccshau_user_roles (user_id, role)
  SELECT v_user_id, 'super_admin'::ccshau_user_role
  WHERE NOT EXISTS (
    SELECT 1 FROM ccshau_user_roles
    WHERE user_id = v_user_id AND role = 'super_admin' AND department_id IS NULL
  );

  RAISE NOTICE 'Super Admin linked for % (%)', v_email, v_user_id;
END $$;

-- Verify
SELECT p.id, p.display_name, p.email, p.is_active, r.role
FROM ccshau_profiles p
JOIN ccshau_user_roles r ON r.user_id = p.id
WHERE r.role = 'super_admin';
