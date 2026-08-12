-- Portrait image for homepage inspirational quotes (admin upload / Azure blob path)

ALTER TABLE ccshau_homepage_quotes
  ADD COLUMN IF NOT EXISTS image_path text;

COMMENT ON COLUMN ccshau_homepage_quotes.image_path IS 'Azure blob path {container}/{blobKey} or external https URL for round portrait';
