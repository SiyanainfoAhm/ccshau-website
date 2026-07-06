-- College microsites under the colleges container were saved as page_type=standard
-- when edited via the page form. Restore college type for affected roots.
UPDATE ccshau_pages AS child
SET page_type = 'college'
FROM ccshau_pages AS parent
WHERE child.parent_id = parent.id
  AND parent.slug = 'colleges'
  AND child.layout_template = 'college_home'
  AND child.page_type <> 'college';
