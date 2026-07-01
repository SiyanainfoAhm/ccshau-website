-- Align college slugs and logos with legacy hau.ac.in homepage (Education At University)

UPDATE ccshau_pages child
SET
  slug = v.new_slug,
  logo_image_path = v.logo_url
FROM ccshau_pages parent
CROSS JOIN (
  VALUES
    (
      'centre-food-science-technology',
      'centre-of-food-science-technology',
      'https://hau.ac.in/public/images/college/logo/8/1547026866.jpg'
    ),
    (
      'ic-college-community-science',
      'ic-college-of-home-science',
      'https://hau.ac.in/public/images/college/logo/9/1741857160.jpg'
    ),
    (
      'college-agricultural-engineering-technology',
      'college-of-agricultural-engineering-and-technology',
      'https://hau.ac.in/public/images/college/logo/11/1538048892.png'
    ),
    (
      'college-fisheries-science',
      'college-of-fisheries-science',
      'https://hau.ac.in/public/images/college/logo/65/1716002752.png'
    ),
    (
      'college-biotechnology',
      'college-of-biotechnology',
      'https://hau.ac.in/public/images/college/logo/67/1782193277.jpg'
    )
) AS v(old_slug, new_slug, logo_url)
WHERE child.parent_id = parent.id
  AND parent.slug = 'colleges'
  AND child.slug = v.old_slug
  AND NOT EXISTS (
    SELECT 1 FROM ccshau_pages existing WHERE existing.slug = v.new_slug AND existing.id <> child.id
  );

UPDATE ccshau_pages child
SET logo_image_path = v.logo_url
FROM ccshau_pages parent
CROSS JOIN (
  VALUES
    ('college-of-agriculture-hisar', 'https://hau.ac.in/public/images/college/logo/2/1540803791.jpg'),
    ('college-of-agriculture-kaul', 'https://hau.ac.in/public/images/college/logo/6/1540803865.jpg'),
    ('college-of-agriculture-bawal', 'https://hau.ac.in/public/images/college/logo/7/1552737173.jpg'),
    ('centre-of-food-science-technology', 'https://hau.ac.in/public/images/college/logo/8/1547026866.jpg'),
    ('ic-college-of-home-science', 'https://hau.ac.in/public/images/college/logo/9/1741857160.jpg'),
    ('college-of-basic-sciences-humanities', 'https://hau.ac.in/public/images/college/logo/10/1540803999.jpg'),
    (
      'college-of-agricultural-engineering-and-technology',
      'https://hau.ac.in/public/images/college/logo/11/1538048892.png'
    ),
    ('college-of-fisheries-science', 'https://hau.ac.in/public/images/college/logo/65/1716002752.png'),
    ('college-of-biotechnology', 'https://hau.ac.in/public/images/college/logo/67/1782193277.jpg')
) AS v(slug, logo_url)
WHERE child.parent_id = parent.id
  AND parent.slug = 'colleges'
  AND child.slug = v.slug
  AND (child.logo_image_path IS NULL OR child.logo_image_path = 'pending');
