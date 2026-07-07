-- PG Studies is a standard CMS hub (/pages/pg-studies), not a college microsite.
UPDATE ccshau_pages
SET page_type = 'standard'
WHERE slug = 'pg-studies';
