-- Restore Haryana Kheti page titles (content labels fixed via
-- scripts/legacy-import/fix-haryanakheti-labels.mjs from legacy hau.ac.in).

UPDATE ccshau_pages
SET
  title_en = 'Haryana Kheti',
  title_hi = 'हरियाणा खेती',
  updated_at = now()
WHERE slug = 'haryanakheti'
  AND (title_en LIKE '%?%' OR title_hi IS NULL OR title_hi = '');
