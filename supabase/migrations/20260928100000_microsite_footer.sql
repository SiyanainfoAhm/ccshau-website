-- Footer content for a college or directorate microsite root page.
-- Empty means the public site builds the block from that microsite's contact lines.

ALTER TABLE ccshau_pages
  ADD COLUMN IF NOT EXISTS microsite_footer jsonb;

COMMENT ON COLUMN ccshau_pages.microsite_footer IS
  'Optional custom footer for a college or directorate. Inner pages reuse the root page value.';
