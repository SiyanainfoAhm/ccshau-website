-- Default CMS module restrictions for legacy university departments.
-- computer-section intentionally omitted (unrestricted for IT fallback roles).

INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (
  VALUES
    ('pages'),
    ('news'),
    ('circulars'),
    ('tenders'),
    ('downloads'),
    ('media'),
    ('feedback')
) AS m(module)
WHERE d.slug = 'university-admin'
ON CONFLICT (department_id, module) DO NOTHING;

INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('pages'), ('news'), ('circulars'), ('feedback')) AS m(module)
WHERE d.slug = 'registrar'
ON CONFLICT (department_id, module) DO NOTHING;

INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('pages'), ('news'), ('downloads'), ('feedback')) AS m(module)
WHERE d.slug = 'academics'
ON CONFLICT (department_id, module) DO NOTHING;

INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('pages'), ('news'), ('downloads')) AS m(module)
WHERE d.slug = 'research'
ON CONFLICT (department_id, module) DO NOTHING;

INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('pages'), ('news'), ('downloads'), ('media')) AS m(module)
WHERE d.slug = 'extension'
ON CONFLICT (department_id, module) DO NOTHING;

INSERT INTO ccshau_department_modules (department_id, module)
SELECT d.id, m.module::ccshau_cms_module
FROM ccshau_departments d
CROSS JOIN (VALUES ('circulars'), ('news'), ('downloads'), ('feedback')) AS m(module)
WHERE d.slug = 'examination'
ON CONFLICT (department_id, module) DO NOTHING;
