-- Keep only true section shells under college microsite roots:
--   department | departments | gallery | {prefix}-department | {prefix}-gallery
-- Detach CMS pages that merely contain "department"/"gallery" in the slug.

UPDATE ccshau_pages AS child
SET
  parent_id = NULL,
  college_root_id = NULL,
  updated_at = now()
FROM ccshau_pages AS root
WHERE child.parent_id = root.id
  AND root.page_type = 'college'
  AND root.college_root_id = root.id
  AND NOT (
    child.slug ~* '^(department|departments|gallery)$'
    OR child.slug ~* '^[a-z0-9]+-department$'
    OR child.slug ~* '^[a-z0-9]+-gallery$'
  );

UPDATE ccshau_pages
SET title_en = 'Departments',
    title_hi = COALESCE(NULLIF(title_hi, ''), 'विभाग'),
    updated_at = now()
WHERE slug ~* '^[a-z0-9]+-department$'
   OR slug IN ('department', 'departments');
