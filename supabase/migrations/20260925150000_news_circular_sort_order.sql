-- Display order for homepage news, notifications, and circulars.
-- Lower numbers appear first. Items with the same order keep newest-first.

ALTER TABLE ccshau_news
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE ccshau_circulars
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN ccshau_news.sort_order IS 'Homepage and listing order. Lower numbers appear first.';
COMMENT ON COLUMN ccshau_circulars.sort_order IS 'Homepage and listing order. Lower numbers appear first.';
