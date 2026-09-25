-- Allow media album items to be PDFs or external links, in addition to images and videos.
ALTER TABLE ccshau_media_items DROP CONSTRAINT IF EXISTS ccshau_media_items_media_type_check;

ALTER TABLE ccshau_media_items
  ADD CONSTRAINT ccshau_media_items_media_type_check
  CHECK (media_type IN ('image', 'video', 'pdf', 'link'));
