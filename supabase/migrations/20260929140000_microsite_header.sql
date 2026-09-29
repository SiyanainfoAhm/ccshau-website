-- Optional custom header for a college or directorate microsite root page.
-- Empty or custom=false keeps the current shared header.

ALTER TABLE ccshau_pages
  ADD COLUMN IF NOT EXISTS microsite_header jsonb;

COMMENT ON COLUMN ccshau_pages.microsite_header IS
  'Optional custom header for a college or directorate. Inner pages reuse the root page value.';
