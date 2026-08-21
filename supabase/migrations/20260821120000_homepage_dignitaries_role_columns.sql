-- Align homepage dignitaries with app schema: role_en / role_hi
-- Production currently has title_en / title_hi from an earlier draft.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ccshau_homepage_dignitaries'
      AND column_name = 'title_en'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ccshau_homepage_dignitaries'
      AND column_name = 'role_en'
  ) THEN
    ALTER TABLE public.ccshau_homepage_dignitaries
      RENAME COLUMN title_en TO role_en;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ccshau_homepage_dignitaries'
      AND column_name = 'title_hi'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ccshau_homepage_dignitaries'
      AND column_name = 'role_hi'
  ) THEN
    ALTER TABLE public.ccshau_homepage_dignitaries
      RENAME COLUMN title_hi TO role_hi;
  END IF;
END $$;

ALTER TABLE public.ccshau_homepage_dignitaries
  ADD COLUMN IF NOT EXISTS role_en text,
  ADD COLUMN IF NOT EXISTS role_hi text;

UPDATE public.ccshau_homepage_dignitaries
SET role_en = COALESCE(NULLIF(role_en, ''), 'Role')
WHERE role_en IS NULL OR role_en = '';

ALTER TABLE public.ccshau_homepage_dignitaries
  ALTER COLUMN role_en SET NOT NULL;
