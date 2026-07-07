-- =============================================================================
-- PG Studies microsite — navigation sections + legacy content migration
-- Legacy: https://hau.ac.in/college/pg-studies
-- Public URLs: /pages/pg-studies, /pages/pg-studies/{section}
-- =============================================================================

UPDATE ccshau_pages
SET
  title_hi = 'स्नातकोत्तर अध्ययन',
  excerpt_en = 'Dean, Postgraduate Studies — CCS Haryana Agricultural University, Hisar.',
  excerpt_hi = 'डीन, स्नातकोत्तर अध्ययन — चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार।',
  layout_template = 'office_portal',
  layout_config = jsonb_build_object(
    'hero', true,
    'headOfficer', true,
    'contacts', true,
    'staff', false,
    'gallery', false,
    'mainContent', false,
    'leftSidebar', false,
    'rightSidebar', false,
    'collegeTopMenu', true,
    'farmersCta', true,
    'heroContactButton', true
  ),
  head_name_en = 'Dr. Kamal Dutt Sharma',
  head_name_hi = 'डॉ. कमल दत्त शर्मा',
  head_role_en = 'Dean Post-graduate Studies',
  head_role_hi = 'डीन, स्नातकोत्तर अध्ययन',
  featured_image_path = COALESCE(
    featured_image_path,
    'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg'
  ),
  office_cta_enabled = true,
  content_en = $en$
<p>Dean, Postgraduate Studies office basically shoulders the following responsibilities:</p>
<ol>
<li>To upgrade the course work in view of the ICAR recommendations and the stakeholders of the State and implementation thereof in letter and spirit.</li>
<li>To monitor the postgraduate research in the university.</li>
<li>To conduct the activities such as admissions, registrations, appointment of examiners, evaluation of thesis, preparation of transcripts, organizing convocation and providing degrees, selections for gold medals, best teacher awards, etc.</li>
</ol>
<p>The Dean, Post-graduate Studies has been entrusted the responsibility of postgraduate teaching at the university in consultation with the Deans of the constituent colleges, Director of Research and Director of Extension Education. Further, Dean is responsible for coordination of research of post-graduate students and its integration with the thrust areas of research. The course curriculum has been updated from time to time as per ICAR guidelines and also by keeping in view the specific requirements of Haryana State.</p>
<h2>Postgraduate Programmes</h2>
<p>Presently, the university offers postgraduate programs comprising Master&rsquo;s in 43 (including MBA) and Doctor of Philosophy in 40 disciplines. In both programs, 25% students are admitted through the ICAR representing different states of India. At the beginning of 2nd Semester 2023-24, a total No. of 1349 students are on roll, comprising of 649 and 700 in M.Sc. and Ph.D. programs, respectively.</p>
<h3>Students on roll in constituent colleges</h3>
<table class="w-full border-collapse text-sm">
<thead>
<tr>
<th rowspan="2">College</th>
<th colspan="3">M.Sc. students</th>
<th colspan="3">Ph.D.</th>
</tr>
<tr>
<th>Male</th>
<th>Female</th>
<th>Total</th>
<th>Male</th>
<th>Female</th>
<th>Total</th>
</tr>
</thead>
<tbody>
<tr><td>Agriculture</td><td>268</td><td>160</td><td>428</td><td>193</td><td>133</td><td>326</td></tr>
<tr><td>Basic Sci. &amp; Humanities</td><td>28</td><td>73</td><td>97</td><td>57</td><td>192</td><td>249</td></tr>
<tr><td>Agri. Engg. &amp; Tech.</td><td>14</td><td>5</td><td>19</td><td>11</td><td>1</td><td>12</td></tr>
<tr><td>Community Science</td><td>0</td><td>74</td><td>74</td><td>0</td><td>84</td><td>84</td></tr>
<tr><td>Fisheries Sci.</td><td>12</td><td>1</td><td>13</td><td>9</td><td>6</td><td>15</td></tr>
<tr><td>Biotech.</td><td>6</td><td>12</td><td>18</td><td>5</td><td>9</td><td>14</td></tr>
<tr><td><strong>TOTAL</strong></td><td><strong>328</strong></td><td><strong>325</strong></td><td><strong>649</strong></td><td><strong>275</strong></td><td><strong>425</strong></td><td><strong>700</strong></td></tr>
</tbody>
</table>
<h2>PG DIPLOMA</h2>
<p>In order to provide job-oriented and/or self-employment opportunities, trainings to fresh graduates as well as persons employed in various organizations requiring technical know-how and wanting to face the challenges in the new millennium, postgraduate diploma courses in Communication Skills in English, English-Hindi Translation in the College of Basic Sciences &amp; Humanities, and Remote Sensing and GIS Applications in Agriculture and Environment in College of Agriculture are offered every year.</p>
$en$,
  content_hi = $hi$
<p>डीन, स्नातकोत्तर अध्ययन कार्यालय मूल रूप से निम्नलिखित जिम्मेदारियों का निर्वहन करता है:</p>
<ol>
<li>आईसीएआर की सिफारिशों और राज्य के हितधारकों के दृष्टिगत पाठ्यक्रम कार्य को उन्नत करना और उसे शाब्दिक एवं व्यावहारिक रूप से लागू करना।</li>
<li>विश्वविद्यालय में स्नातकोत्तर अनुसंधान की निगरानी करना।</li>
<li>प्रवेश, पंजीकरण, परीक्षकों की नियुक्ति, शोध प्रबंध मूल्यांकन, ट्रांसक्रिप्ट तैयारी, दीक्षांत समारोह आयोजन, डिग्री प्रदान करना, स्वर्ण पदक चयन, सर्वश्रेष्ठ शिक्षक पुरस्कार आदि गतिविधियों का संचालन करना।</li>
</ol>
<p>डीन, स्नातकोत्तर अध्ययन को घटक महाविद्यालयों के डीन, अनुसंधान निदेशक और विस्तार शिक्षा निदेशक के परामर्श से विश्वविद्यालय में स्नातकोत्तर शिक्षण की जिम्मेदारी सौंपी गई है।</p>
<h2>स्नातकोत्तर कार्यक्रम</h2>
<p>वर्तमान में विश्वविद्यालय 43 (एमबीए सहित) विषयों में मास्टर और 40 विषयों में डॉक्टर ऑफ फिलॉसफी कार्यक्रम प्रदान करता है। 2023-24 के दूसरे सेमेस्टर की शुरुआत में कुल 1349 छात्र नामांकित हैं, जिनमें 649 एम.एससी. और 700 पीएच.डी. में हैं।</p>
<h2>पीजी डिप्लोमा</h2>
<p>रोजगार और स्वरोजगार के अवसर प्रदान करने हेतु मूल विज्ञान एवं मानविकी महाविद्यालय में अंग्रेजी संचार कौशल तथा कृषि महाविद्यालय में कृषि और पर्यावरण में रिमोट सेंसिंग और जीआईएस अनुप्रयोगों में स्नातकोत्तर डिप्लोमा पाठ्यक्रम प्रस्तुत किए जाते हैं।</p>
$hi$
WHERE slug = 'pg-studies';

-- -----------------------------------------------------------------------------
-- Child section pages
-- -----------------------------------------------------------------------------

INSERT INTO ccshau_pages (
  slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi,
  parent_id, page_type, layout_template, layout_config, status, published_at, sort_order
)
SELECT
  v.slug,
  v.title_en,
  v.title_hi,
  v.excerpt_en,
  v.excerpt_hi,
  v.content_en,
  v.content_hi,
  hub.id,
  'standard',
  'standard',
  v.layout_config,
  'published',
  now(),
  v.sort_order
FROM ccshau_pages hub
CROSS JOIN (
  VALUES
    (
      'pg-course-catalogue',
      'PG Course Catalogue',
      'पीजी पाठ्यक्रम सूची',
      'Download PG course catalogues by college.',
      'महाविद्यालयवार पीजी पाठ्यक्रम सूची डाउनलोड करें।',
      $cat_en$
<h2>PG Course Catalogue</h2>
<table class="w-full border-collapse text-sm">
<tbody>
<tr><td class="p-3 text-center"><strong>GENERAL INFORMATION</strong></td></tr>
<tr><td class="p-3 text-center"><a href="https://hau.ac.in/storage/app/uploads/5ezPa9MBTSaosf4iL3alw0opcyVOs2EghZ9tIRfT.pdf" target="_blank" rel="noopener noreferrer">COMPULSORY NON CREDIT COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/4qsHgyZznwgDH4ZOLgjmkxwaB3i8a2ZZBbO8Tlal.pdf" target="_blank" rel="noopener noreferrer">COAE&amp;T COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/WixIHW5kumtRtsVzH2S3wpO52csylhmI3WJjlpXV.pdf" target="_blank" rel="noopener noreferrer">COA COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/LIyoiUCb1Le2AQpyDtIXKLyJ9FOA9LcK1FJr5oMZ.pdf" target="_blank" rel="noopener noreferrer">COBS&amp;H COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/goC61ogk1WeNCIjDZxr6JZbaKr4SE9vNo5nfhJ1P.pdf" target="_blank" rel="noopener noreferrer">COHS COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/Mjc0AsMXhMPyez4jMP2GxUFUiav8b05T0dyXr6FV.pdf" target="_blank" rel="noopener noreferrer">CFST COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://www.hau.ac.in/storage/app/uploads/oWIlHuGNEnOcuX37lno0rq0OUVKfrqgxwFAwI8Eb.pdf" target="_blank" rel="noopener noreferrer">FISHERIES COURSES</a></td></tr>
<tr><td class="p-3 text-center"><a href="https://hau.ac.in/storage/app/uploads/gEeKazQHqicdKXfshBC9Pay7QkEv8IkGTwU3ayli.pdf" target="_blank" rel="noopener noreferrer">BIOTECHNOLOGY COURSES</a></td></tr>
</tbody>
</table>
$cat_en$,
      $cat_hi$
<h2>पीजी पाठ्यक्रम सूची</h2>
<p>महाविद्यालयवार पीजी पाठ्यक्रम सूची के लिए नीचे दिए गए लिंक पर क्लिक करें।</p>
$cat_hi$,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', false, 'staff', false,
        'gallery', false, 'mainContent', true, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      1
    ),
    (
      'pg-proforma',
      'PG Proforma',
      'पीजी प्रपत्र',
      'Downloadable PG proforma and examination forms.',
      'डाउनलोड योग्य पीजी प्रपत्र और परीक्षा फॉर्म।',
      $pro_en$
<h2>PG Proforma</h2>
<ol>
<li><a href="https://hau.ac.in/storage/app/uploads/Hg1ChoXQUdWyXmQ1WKkw9WxF1cJc3AxcKkHJbP2N.doc" target="_blank" rel="noopener noreferrer"><strong>PG-1.doc</strong></a> (Recommendations of Advisory Committee)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/Ip1UZK1i7jyQrCpKCnn6CCXe2aKyEtULFB68ugPZ.doc" target="_blank" rel="noopener noreferrer"><strong>PG-2.doc</strong></a> (Programme of Work)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/HndmRlymGd3sUYWRNmyKnJ3nMsyfEb0yx0WKFikp.doc" target="_blank" rel="noopener noreferrer"><strong>PG-3.doc</strong></a> (Submission of Synopsis)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/SbGAg3ZbthZfOsYu95DJHREdwBXWZY9PtYla7KvG.pdf" target="_blank" rel="noopener noreferrer"><strong>PG-4.pdf</strong></a> (Preliminary Written Examination)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/Uk66lgl9WhCvFOZ8hrLbU4lofXxEEQbF0jSEuITE.doc" target="_blank" rel="noopener noreferrer"><strong>PG-5A.doc</strong></a> (Preliminary Oral Examination Panel)</li>
<li><a href="https://www.hau.ac.in/storage/app/uploads/71ComFzqH6s3lzTCA8ZW5LltBl5H5x9ttQRYvHMK.pdf" target="_blank" rel="noopener noreferrer"><strong>PG-5B</strong></a> (External Examiner Panel)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/J9u8UW7F2O2WhsXSlLXRy2iCT7Ah080Rqu1UhKZx.doc" target="_blank" rel="noopener noreferrer"><strong>PG-6.doc</strong></a> (Certificate of Preliminary Examination Ph.D)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/5yzk1fW9xjbsNDGrTEA0rQS66u3Szd9yCyc7xp7J.doc" target="_blank" rel="noopener noreferrer"><strong>PG-7.doc</strong></a> (Report on the Preliminary Examination for the Final Examination)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/nOYVcp1FLMaM2beECscPQLFbIETAYZl27kVPVlS8.doc" target="_blank" rel="noopener noreferrer"><strong>PG-8.doc</strong></a> (Thesis Seminar Certificate)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/BcFjtKLSZotTneVBA7hQQ2jYQCnLGRdIUXJ3R5wi.doc" target="_blank" rel="noopener noreferrer"><strong>PG-9.doc</strong></a> (Thesis Submission Proforma)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/octfteOHScfTCbwDJzpWd1z77GWub3rPxsW2JRqB.doc" target="_blank" rel="noopener noreferrer"><strong>PG-10.doc</strong></a> (Certificate of Oral Examination)</li>
<li><a href="https://hau.ac.in/storage/app/uploads/Px0T4LWWZ48utLeafl5yWH7RtT6iCAFe8oSdCQ5n.doc" target="_blank" rel="noopener noreferrer"><strong>I-Grade.doc</strong></a></li>
<li><a href="https://hau.ac.in/storage/app/uploads/UdUrfIol8arMZunMCdPA6ynKBOAYFHiD7qtfWy6v.doc" target="_blank" rel="noopener noreferrer"><strong>Instructor Report.doc</strong></a></li>
<li><a href="https://hau.ac.in/storage/app/uploads/cwxdS3FmMXbBWNxxOlsCJ8fBWUEByBNQqvO0bBs2.rtf" target="_blank" rel="noopener noreferrer"><strong>REMUNERATION TO EXAMINERS.doc</strong></a></li>
<li><a href="https://hau.ac.in/storage/app/uploads/skr5HYvBgCxMzxtg5pDwkrBOz7c6Bj5GhyUjoOnX.pdf" target="_blank" rel="noopener noreferrer"><strong>Plagiarism Verification Certificate.pdf</strong></a></li>
<li><a href="https://hau.ac.in/registration/pgs-registration" target="_blank" rel="noopener noreferrer"><strong>Apply online for attending Seminar/Workshop etc.</strong></a></li>
</ol>
$pro_en$,
      $pro_hi$
<h2>पीजी प्रपत्र</h2>
<p>नीचे दिए गए लिंक से पीजी प्रपत्र डाउनलोड करें।</p>
$pro_hi$,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', false, 'staff', false,
        'gallery', false, 'mainContent', true, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      2
    ),
    (
      'seminar-registration',
      'Seminar Registration',
      'सेमिनार पंजीकरण',
      'Online registration for PG seminars and workshops.',
      'पीजी सेमिनार और कार्यशालाओं के लिए ऑनलाइन पंजीकरण।',
      $sem_en$
<h2>Seminar Registration</h2>
<p>RA/SRF/JRF/M.Tech./Ph.D. students can apply online for attending seminars, workshops and related academic events.</p>
<p><a class="inline-flex rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white no-underline hover:bg-emerald-500" href="https://hau.ac.in/registration/pgs-registration" target="_blank" rel="noopener noreferrer">Apply online for Seminar Registration</a></p>
$sem_en$,
      $sem_hi$
<h2>सेमिनार पंजीकरण</h2>
<p>आरए/एसआरएफ/जेआरएफ/एम.टेक./पीएच.डी. छात्र सेमिनार और कार्यशालाओं हेतु ऑनलाइन आवेदन कर सकते हैं।</p>
<p><a href="https://hau.ac.in/registration/pgs-registration" target="_blank" rel="noopener noreferrer">ऑनलाइन पंजीकरण के लिए यहाँ क्लिक करें</a></p>
$sem_hi$,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', false, 'staff', false,
        'gallery', false, 'mainContent', true, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      3
    ),
    (
      'pg-studies-gallery',
      'Gallery',
      'गैलरी',
      'Photo gallery from Post Graduate Studies.',
      'स्नातकोत्तर अध्ययन की फोटो गैलरी।',
      NULL,
      NULL,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', false, 'staff', false,
        'gallery', true, 'mainContent', false, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      4
    ),
    (
      'pg-studies-contact',
      'Contact Us',
      'संपर्क करें',
      'Contact Post Graduate Studies office.',
      'स्नातकोत्तर अध्ययन कार्यालय से संपर्क करें।',
      NULL,
      NULL,
      jsonb_build_object(
        'hero', false, 'headOfficer', false, 'contacts', true, 'staff', false,
        'gallery', false, 'mainContent', false, 'leftSidebar', false, 'rightSidebar', false,
        'collegeTopMenu', true, 'farmersCta', false, 'heroContactButton', false
      ),
      5
    )
) AS v(slug, title_en, title_hi, excerpt_en, excerpt_hi, content_en, content_hi, layout_config, sort_order)
WHERE hub.slug = 'pg-studies'
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  title_en = EXCLUDED.title_en,
  title_hi = EXCLUDED.title_hi,
  excerpt_en = EXCLUDED.excerpt_en,
  excerpt_hi = EXCLUDED.excerpt_hi,
  content_en = EXCLUDED.content_en,
  content_hi = EXCLUDED.content_hi,
  layout_config = EXCLUDED.layout_config,
  sort_order = EXCLUDED.sort_order,
  status = 'published',
  published_at = COALESCE(ccshau_pages.published_at, now());

-- Gallery images
DELETE FROM ccshau_page_gallery_items
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'pg-studies-gallery');

INSERT INTO ccshau_page_gallery_items (
  page_id, image_url, thumbnail_url, title_en, title_hi, sort_order, is_active
)
SELECT p.id, v.image_url, v.thumbnail_url, v.title_en, v.title_hi, v.sort_order, true
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    ('https://hau.ac.in/public/images/college/banner/44/1624419644.jpg', 'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg', 'PG Studies Block', 'पीजी अध्ययन ब्लॉक', 1),
    ('https://hau.ac.in/public/images/college/banner/44/1624419644.jpg', 'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg', 'Campus', 'परिसर', 2)
) AS v(image_url, thumbnail_url, title_en, title_hi, sort_order)
WHERE p.slug = 'pg-studies-gallery';
