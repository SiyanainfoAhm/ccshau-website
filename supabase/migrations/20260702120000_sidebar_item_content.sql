-- Sidebar quick links: optional inline content when no URL is set

ALTER TABLE ccshau_page_sidebar_items
  ADD COLUMN IF NOT EXISTS content_en text,
  ADD COLUMN IF NOT EXISTS content_hi text;

COMMENT ON COLUMN ccshau_page_sidebar_items.content_en IS 'Inline HTML content shown in main area when href is empty';
COMMENT ON COLUMN ccshau_page_sidebar_items.content_hi IS 'Hindi inline HTML content when href is empty';
