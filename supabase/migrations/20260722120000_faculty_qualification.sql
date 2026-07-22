-- Faculty qualification fields for department directory profiles.

ALTER TABLE ccshau_page_staff
  ADD COLUMN IF NOT EXISTS qualification_en text,
  ADD COLUMN IF NOT EXISTS qualification_hi text;

COMMENT ON COLUMN ccshau_page_staff.qualification_en IS 'Academic/professional qualification (English)';
COMMENT ON COLUMN ccshau_page_staff.qualification_hi IS 'Academic/professional qualification (Hindi)';
