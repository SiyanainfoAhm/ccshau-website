-- Allow homepage banners to be images or video media.
ALTER TABLE ccshau_banners
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';

ALTER TABLE ccshau_banners
  ADD CONSTRAINT ccshau_banners_media_type_check
  CHECK (media_type IN ('image', 'video'));
