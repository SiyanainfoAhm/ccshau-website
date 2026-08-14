-- Hide Hisar Agriculture crop/teaching sections from the Departments dropdown
-- via layout_config.showInDepartmentsMenu = false. Nehru Library / other
-- "Section" menu items stay visible (default true).

UPDATE ccshau_pages AS dept
SET
  layout_config = coalesce(dept.layout_config, '{}'::jsonb)
    || jsonb_build_object('showInDepartmentsMenu', false),
  updated_at = now()
FROM ccshau_pages AS d
JOIN ccshau_pages AS c ON d.parent_id = c.id
WHERE dept.parent_id = d.id
  AND c.slug = 'college-of-agriculture-hisar'
  AND (d.slug ILIKE '%department%' OR d.title_en ILIKE 'department%')
  AND (
    dept.slug LIKE '%-section'
    OR lower(coalesce(dept.title_en, '')) LIKE '% section'
  );
