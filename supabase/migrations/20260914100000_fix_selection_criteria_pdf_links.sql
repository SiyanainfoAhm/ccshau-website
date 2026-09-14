-- Fix news items that linked to missing legacy-storage/circular-pdf blobs.
-- Circulars were imported under circulars/{id}/filename.pdf instead.

UPDATE ccshau_news
SET
  body_en = '<p><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/circulars/5c679978-09e0-4148-8a99-f6d2323db1fd/3M2Fsw06va07uAXOu0NtpJRi8fjdjo3H6Pcayau4.pdf" target="_blank" rel="noopener noreferrer">Open PDF</a></p>',
  updated_at = now()
WHERE id IN (
  '506884aa-607d-4f9c-8660-7572774576f7',
  '3941f463-3740-4fca-a123-231037260e74'
);

UPDATE ccshau_news
SET
  body_en = '<p><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/circulars/168202d5-c607-4928-a211-7fd4b393182e/kOGMdXTKUohcjTp9n852yAtc7e2O0a9uFZ4lxvBd.pdf" target="_blank" rel="noopener noreferrer">Open PDF</a></p>',
  updated_at = now()
WHERE id = '6b2afb14-11fe-4703-a8c0-55691ef00f23';
