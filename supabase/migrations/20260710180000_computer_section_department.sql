-- Computer Section organizational unit (IT / technical admin).
-- Users assigned here with super_admin or university_admin roles get full CMS control.
-- No department_modules rows → unrestricted content modules for dept-scoped roles.

INSERT INTO ccshau_departments (slug, name_en, name_hi, sort_order) VALUES
  ('computer-section', 'Computer Section', 'कम्प्यूटर अनुभाग', 0)
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_hi = EXCLUDED.name_hi,
  sort_order = EXCLUDED.sort_order;
