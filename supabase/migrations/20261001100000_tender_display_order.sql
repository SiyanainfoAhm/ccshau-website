ALTER TABLE ccshau_tenders
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS ccshau_idx_tenders_sort_order
  ON ccshau_tenders (sort_order, published_at DESC);
