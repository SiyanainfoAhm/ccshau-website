-- College pages: map coordinates for contact page embed
ALTER TABLE ccshau_pages
  ADD COLUMN IF NOT EXISTS map_lat numeric(10, 7),
  ADD COLUMN IF NOT EXISTS map_lng numeric(10, 7);

COMMENT ON COLUMN ccshau_pages.map_lat IS 'Latitude for college contact map embed';
COMMENT ON COLUMN ccshau_pages.map_lng IS 'Longitude for college contact map embed';
