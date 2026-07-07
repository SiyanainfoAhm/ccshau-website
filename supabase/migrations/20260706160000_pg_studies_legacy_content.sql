-- =============================================================================
-- PG Studies — legacy About content from https://www.hau.ac.in/college/pg-studies
-- (About PG Studies only; News and Student Corner excluded)
-- Public URL: /pages/pg-studies
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
    'collegeTopMenu', false,
    'farmersCta', true,
    'heroContactButton', false
  ),
  head_name_en = 'Dr. Ramesh Kumar',
  head_name_hi = 'डॉ. रमेश कुमार',
  head_role_en = 'Dean',
  head_role_hi = 'डीन',
  featured_image_path = 'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg',
  office_cta_enabled = true,
  content_en = $en$
<p>Dean, Postgraduate Studies office basically shoulders the following responsibilities:</p>
<ol>
<li>To upgrade the course work in view of the ICAR recommendations and the stakeholders of the State and implementation thereof in letter and spirit.</li>
<li>To monitor the postgraduate research in the university.</li>
<li>To conduct the activities such as admissions, registrations, appointment of examiners, evaluation of thesis, preparation of transcripts, organizing convocation and providing degrees, selections for gold medals, best teacher awards, etc.</li>
</ol>
<p>The Dean, Post-graduate Studies has been entrusted the responsibility of postgraduate teaching at the university in consultation with the Deans of the constituent colleges, Director of Research and Director of Extension Education. Further, Dean is responsible for coordination of research of post-graduate students and its integration with the thrust areas of research. The course curriculum has been updated from time to time as per ICAR guidelines and also by keeping in view the specific requirements of Haryana State.</p>
$en$,
  content_hi = $hi$
<p>डीन, स्नातकोत्तर अध्ययन कार्यालय मूल रूप से निम्नलिखित जिम्मेदारियों का निर्वहन करता है:</p>
<ol>
<li>आईसीएआर की सिफारिशों और राज्य के हितधारकों के दृष्टिगत पाठ्यक्रम कार्य को उन्नत करना और उसे शाब्दिक एवं व्यावहारिक रूप से लागू करना।</li>
<li>विश्वविद्यालय में स्नातकोत्तर अनुसंधान की निगरानी करना।</li>
<li>प्रवेश, पंजीकरण, परीक्षकों की नियुक्ति, शोध प्रबंध मूल्यांकन, ट्रांसक्रिप्ट तैयारी, दीक्षांत समारोह आयोजन, डिग्री प्रदान करना, स्वर्ण पदक चयन, सर्वश्रेष्ठ शिक्षक पुरस्कार आदि गतिविधियों का संचालन करना।</li>
</ol>
<p>डीन, स्नातकोत्तर अध्ययन को घटक महाविद्यालयों के डीन, अनुसंधान निदेशक और विस्तार शिक्षा निदेशक के परामर्श से विश्वविद्यालय में स्नातकोत्तर शिक्षण की जिम्मेदारी सौंपी गई है। इसके अतिरिक्त, डीन स्नातकोत्तर छात्रों के अनुसंधान के समन्वय और अनुसंधान के प्रमुख क्षेत्रों के साथ उसके एकीकरण के लिए जिम्मेदार है। पाठ्यक्रम को समय-समय पर आईसीएआर दिशानिर्देशों के अनुसार तथा हरियाणा राज्य की विशिष्ट आवश्यकताओं को ध्यान में रखते हुए अद्यतन किया जाता रहा है।</p>
$hi$
WHERE slug = 'pg-studies';

DELETE FROM ccshau_page_contact_lines
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'pg-studies');

INSERT INTO ccshau_page_contact_lines (page_id, label_en, label_hi, value_en, value_hi, sort_order)
SELECT p.id, v.label_en, v.label_hi, v.value_en, v.value_hi, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'Mailing Address',
      'डाक पता',
      'Postgraduate Studies, CCS Haryana Agricultural University, Hisar - 125004, India.',
      'स्नातकोत्तर अध्ययन, चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार - 125004, भारत।',
      1
    ),
    (
      'Office',
      'कार्यालय',
      'Office : +91 1662-255326',
      'कार्यालय : +91 1662-255326',
      2
    ),
    (
      'Email Id',
      'ई-मेल आईडी',
      'dpgs@hau.ac.in',
      'dpgs@hau.ac.in',
      3
    )
) AS v(label_en, label_hi, value_en, value_hi, sort_order)
WHERE p.slug = 'pg-studies';
