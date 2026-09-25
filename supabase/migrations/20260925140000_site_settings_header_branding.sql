-- =============================================================================
-- CCSHAU_ site settings — public header motto, logo, and portrait
-- =============================================================================

ALTER TABLE ccshau_site_settings
  ADD COLUMN IF NOT EXISTS header_tagline_en text,
  ADD COLUMN IF NOT EXISTS header_tagline_hi text,
  ADD COLUMN IF NOT EXISTS header_logo_path text,
  ADD COLUMN IF NOT EXISTS header_portrait_path text,
  ADD COLUMN IF NOT EXISTS header_short_name text,
  ADD COLUMN IF NOT EXISTS header_name_en text,
  ADD COLUMN IF NOT EXISTS header_name_hi text,
  ADD COLUMN IF NOT EXISTS header_accreditation_en text,
  ADD COLUMN IF NOT EXISTS header_accreditation_hi text;

COMMENT ON COLUMN ccshau_site_settings.header_tagline_en IS 'Public header motto (English). Empty uses the built-in default.';
COMMENT ON COLUMN ccshau_site_settings.header_tagline_hi IS 'Public header motto (Hindi). Empty uses the built-in default.';
COMMENT ON COLUMN ccshau_site_settings.header_logo_path IS 'Azure path for the header logo (left). Empty uses the built-in seal.';
COMMENT ON COLUMN ccshau_site_settings.header_portrait_path IS 'Azure path for the header portrait (right). Empty uses the built-in photo.';
COMMENT ON COLUMN ccshau_site_settings.header_short_name IS 'Short name beside the logo, such as CCSHAU.';
COMMENT ON COLUMN ccshau_site_settings.header_name_en IS 'Full university name in the header (English).';
COMMENT ON COLUMN ccshau_site_settings.header_name_hi IS 'Full university name in the header (Hindi).';
COMMENT ON COLUMN ccshau_site_settings.header_accreditation_en IS 'Accreditation line in the header (English).';
COMMENT ON COLUMN ccshau_site_settings.header_accreditation_hi IS 'Accreditation line in the header (Hindi).';
