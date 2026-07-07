-- Optional expiry and file attachment for page news ticker items

ALTER TABLE ccshau_page_news_ticker_items
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS file_path text;

COMMENT ON COLUMN ccshau_page_news_ticker_items.expires_at IS 'When set, headline is hidden from the public ticker after this time';
COMMENT ON COLUMN ccshau_page_news_ticker_items.file_path IS 'Storage path (bucket/key) for optional PDF or document link';

CREATE INDEX IF NOT EXISTS ccshau_idx_page_news_ticker_items_expires
  ON ccshau_page_news_ticker_items (expires_at)
  WHERE expires_at IS NOT NULL;
