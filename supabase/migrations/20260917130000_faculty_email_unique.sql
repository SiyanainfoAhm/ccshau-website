-- Faculty login provisioning uses email as the stable identity lookup.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM ccshau_faculty_people
    WHERE email IS NOT NULL
      AND btrim(email) <> ''
    GROUP BY lower(btrim(email))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce unique faculty emails: duplicate values exist in ccshau_faculty_people';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ccshau_uq_faculty_people_email_ci
  ON ccshau_faculty_people (lower(btrim(email)))
  WHERE email IS NOT NULL
    AND btrim(email) <> '';
