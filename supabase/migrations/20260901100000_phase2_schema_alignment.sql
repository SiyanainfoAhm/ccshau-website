-- Phase 2 Hindi: align remote schema with app expectations (idempotent).

-- 1) Restore ccshau_page_staff (production had ccshau_page_staff_old)
DO $$
BEGIN
  IF to_regclass('public.ccshau_page_staff') IS NULL
     AND to_regclass('public.ccshau_page_staff_old') IS NOT NULL THEN
    DROP POLICY IF EXISTS ccshau_pol_page_staff_select_active ON ccshau_page_staff_old;
    DROP POLICY IF EXISTS ccshau_pol_page_staff_select_authenticated ON ccshau_page_staff_old;
    ALTER TABLE ccshau_page_staff_old RENAME TO ccshau_page_staff;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.ccshau_page_staff') IS NOT NULL THEN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ccshau_page_staff'
      AND policyname = 'ccshau_pol_page_staff_select_active'
  ) THEN
    CREATE POLICY ccshau_pol_page_staff_select_active
      ON ccshau_page_staff FOR SELECT TO anon
      USING (
        is_active = true
        AND EXISTS (
          SELECT 1 FROM ccshau_pages p
          WHERE p.id = page_id AND p.status = 'published'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ccshau_page_staff'
      AND policyname = 'ccshau_pol_page_staff_select_authenticated'
  ) THEN
    CREATE POLICY ccshau_pol_page_staff_select_authenticated
      ON ccshau_page_staff FOR SELECT TO authenticated USING (true);
  END IF;
  END IF;
END $$;

-- 2) Homepage CTA: add canonical columns (app uses title_en / subtitle_en / button_en / link_href)
ALTER TABLE ccshau_homepage_cta
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_hi text,
  ADD COLUMN IF NOT EXISTS subtitle_en text,
  ADD COLUMN IF NOT EXISTS subtitle_hi text,
  ADD COLUMN IF NOT EXISTS button_en text,
  ADD COLUMN IF NOT EXISTS button_hi text,
  ADD COLUMN IF NOT EXISTS link_href text;

UPDATE ccshau_homepage_cta
SET
  title_en = COALESCE(title_en, label_en),
  title_hi = COALESCE(title_hi, label_hi),
  subtitle_en = COALESCE(subtitle_en, description_en),
  subtitle_hi = COALESCE(subtitle_hi, description_hi),
  button_en = COALESCE(NULLIF(button_en, ''), 'Click Here'),
  button_hi = COALESCE(button_hi, label_hi, 'यहाँ क्लिक करें'),
  link_href = COALESCE(link_href, href)
WHERE id = 1;

-- 3) Homepage dignitaries: role_en / role_hi (rename from title_* when needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ccshau_homepage_dignitaries'
      AND column_name = 'title_en'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ccshau_homepage_dignitaries'
      AND column_name = 'role_en'
  ) THEN
    ALTER TABLE public.ccshau_homepage_dignitaries RENAME COLUMN title_en TO role_en;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ccshau_homepage_dignitaries'
      AND column_name = 'title_hi'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ccshau_homepage_dignitaries'
      AND column_name = 'role_hi'
  ) THEN
    ALTER TABLE public.ccshau_homepage_dignitaries RENAME COLUMN title_hi TO role_hi;
  END IF;
END $$;

ALTER TABLE public.ccshau_homepage_dignitaries
  ADD COLUMN IF NOT EXISTS role_en text,
  ADD COLUMN IF NOT EXISTS role_hi text;

UPDATE public.ccshau_homepage_dignitaries
SET role_en = COALESCE(NULLIF(role_en, ''), 'Role')
WHERE role_en IS NULL OR role_en = '';
