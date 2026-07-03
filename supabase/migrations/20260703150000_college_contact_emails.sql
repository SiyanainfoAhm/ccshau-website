-- Add secondary email for College of Agriculture, Hisar contact page
UPDATE ccshau_page_contact_lines
SET
  value_en = 'dcoag@hau.ac.in, dcoaghau@gmail.com',
  value_hi = 'dcoag@hau.ac.in, dcoaghau@gmail.com'
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'college-of-agriculture-hisar')
  AND label_en = 'Email Id';
