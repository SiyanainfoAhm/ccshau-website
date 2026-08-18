-- Link a CMS login to one shared faculty person profile.
ALTER TABLE ccshau_faculty_people
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN ccshau_faculty_people.user_id IS
  'Auth user who may edit this shared faculty profile (My profile).';

CREATE UNIQUE INDEX IF NOT EXISTS ccshau_idx_faculty_people_user_id
  ON ccshau_faculty_people (user_id)
  WHERE user_id IS NOT NULL;
