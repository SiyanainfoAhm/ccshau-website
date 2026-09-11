-- Restore Bee Keeping (/pages/l) titles & excerpts.
-- Full Hindi content labels fixed via scripts/legacy-import/fix-beekeping-labels.mjs
-- from legacy https://hau.ac.in/page/l

UPDATE ccshau_pages
SET
  title_en = 'Bee Keeping',
  title_hi = 'मधुमक्खी पालन',
  excerpt_en = 'मधुमक्खी पालन — CCS HAU.',
  excerpt_hi = 'मधुमक्खी पालन — सीसीएस एचएयू.',
  updated_at = now()
WHERE slug = 'l';
