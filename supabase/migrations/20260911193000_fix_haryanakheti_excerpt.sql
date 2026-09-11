-- Fix garbled Haryana Kheti page excerpt under the hero title.

UPDATE ccshau_pages
SET
  excerpt_en = 'हरियाणा खेती — CCS HAU.',
  excerpt_hi = 'हरियाणा खेती — सीसीएस एचएयू.',
  updated_at = now()
WHERE slug = 'haryanakheti';
