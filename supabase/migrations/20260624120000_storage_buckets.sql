-- CCSHAU Storage buckets (Phase 3)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('ccshau-public', 'ccshau-public', true, 26214400),
  ('ccshau-private', 'ccshau-private', false, 26214400),
  ('ccshau-media', 'ccshau-media', true, 104857600)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS ccshau_storage_public_read ON storage.objects;
CREATE POLICY ccshau_storage_public_read
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('ccshau-public', 'ccshau-media'));
