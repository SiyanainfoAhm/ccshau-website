-- Agricultural Economics (Hisar) — faculty migrated from legacy hau.ac.in department API
-- Source: https://www.hau.ac.in/department-faculty/teaching_staff/2/1

UPDATE ccshau_pages
SET
  layout_template = 'office_portal',
  layout_config = jsonb_build_object(
    'hero', true,
    'headOfficer', false,
    'contacts', false,
    'staff', true,
    'leftSidebar', true,
    'rightSidebar', false,
    'mainContent', true,
    'farmersCta', false,
    'collegeTopMenu', true,
    'heroContactButton', false
  )
WHERE slug = 'agricultural-economics-hisar';

UPDATE ccshau_page_sidebar_items
SET
  label_hi = 'संकाय',
  content_en = NULL,
  content_hi = NULL
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'agricultural-economics-hisar')
  AND label_en = 'Faculty';

DELETE FROM ccshau_page_staff
WHERE page_id = (SELECT id FROM ccshau_pages WHERE slug = 'agricultural-economics-hisar');

INSERT INTO ccshau_page_staff (
  page_id, name_en, name_hi, designation_en, designation_hi,
  specialization_en, specialization_hi, image_path, sort_order
)
SELECT p.id, v.name_en, v.name_hi, v.designation_en, v.designation_hi,
       v.specialization_en, v.specialization_hi, v.image_path, v.sort_order
FROM ccshau_pages p
CROSS JOIN (
  VALUES
    (
      'Dr. DharmPal Malik',
      'डॉ. धर्म पाल मलिक',
      'Professor and Head',
      'प्राध्यापक एवं विभागाध्यक्ष',
      'Farm Management, Agriculture Finance, Agricultural Marketing & Price Analysis',
      'फार्म प्रबंधन, कृषि वित्त, कृषि विपणन एवं मूल्य विश्लेषण',
      'https://www.hau.ac.in/storage/app/uploads/college-user/ngRi8KD7UmPXkGFtlxQMiS1rNoUblq5nfA8vFjyo.png',
      1
    ),
    (
      'Dr. Sanjay Kumar',
      'डॉ. संजय कुमार',
      'Assoc. Professor',
      'सहायक प्राध्यापक',
      'Farm Management',
      'फार्म प्रबंधन',
      'https://www.hau.ac.in/storage/app/uploads/college-user/g4szECjOChfmSLgNCWKbhobCT8MA8SDbPBWEs1mN.jpeg',
      2
    ),
    (
      'Dr. Vinay Mehala',
      'डॉ. विनय मेहला',
      'Asstt. Scientist',
      'सहायक वैज्ञानिक',
      'Agricultural Marketing & Farm Management',
      'कृषि विपणन एवं फार्म प्रबंधन',
      'https://www.hau.ac.in/storage/app/uploads/college-user/zbHBIWATWZWqrmAi2pfPZA540RXn4M8jUctq8Okv.jpeg',
      3
    ),
    (
      'Dr. Sumit',
      'डॉ. सुमित',
      'Assistant Scientist (Agril. Economics)',
      'सहायक वैज्ञानिक (कृषि अर्थशास्त्र)',
      'Farm Management and Production Economics',
      'फार्म प्रबंधन एवं उत्पादन अर्थशास्त्र',
      'https://www.hau.ac.in/storage/app/uploads/college-user/YDvROz8x6tY9173V2HfjJ7iUER48INLBFMKUldjs.jpeg',
      4
    ),
    (
      'Dr. Monika Devi',
      'डॉ. मोनिका देवी',
      'Assistant Scientist (Statistics)',
      'सहायक वैज्ञानिक (सांख्यिकी)',
      'Sample Surveys, Statistical Modelling',
      'नमूना सर्वेक्षण, सांख्यिकीय मॉडलिंग',
      'https://www.hau.ac.in/storage/app/uploads/college-user/lucqGBtZ3tCUiUim90DrAzkfSqSSURaF6FkVfK3G.png',
      5
    ),
    (
      'Dr. Neeraj Pawar',
      'डॉ. नीरज पवार',
      'Assistant Scientist',
      'सहायक वैज्ञानिक',
      'Agricultural Marketing',
      'कृषि विपणन',
      'https://www.hau.ac.in/storage/app/uploads/college-user/3pJmp4MzRNIYfR59yW26DkyYhiv9yv9zgwm3gdmQ.jpeg',
      6
    ),
    (
      'Dr. Janailin S. Papang',
      'डॉ. जनैलिन एस. पापांग',
      'Assistant Professor',
      'सहायक प्राध्यापक',
      'Production economics and agricultural marketing',
      'उत्पादन अर्थशास्त्र एवं कृषि विपणन',
      'https://www.hau.ac.in/storage/app/uploads/college-user/lBLWrx2lLkjXFpMr7ayhAy6Nro7I8C4U1gGwyR7X.png',
      7
    ),
    (
      'Dr. Rijul Sihag',
      'डॉ. रिजुल सिहाग',
      'Assistant Scientist (Rural Sociology)',
      'सहायक वैज्ञानिक (ग्रामीण समाजशास्त्र)',
      'Sociology, socio-economic development',
      'समाजशास्त्र, सामाजिक-आर्थिक विकास',
      'https://www.hau.ac.in/storage/app/uploads/college-user/1kSiYTnbNQzyJ1ncTghaOLROCaFhiSf7ILfF5R9d.jpeg',
      8
    ),
    (
      'Dr. Sanjay',
      'डॉ. संजय',
      'Assistant Professor',
      'सहायक प्राध्यापक',
      'Agricultural Finance',
      'कृषि वित्त',
      'https://www.hau.ac.in/storage/app/uploads/college-user/Dnx5ylEDEA9dcyFzRcBZbxkADcaRsWXnPzQs7vOC.jpeg',
      9
    )
) AS v(
  name_en, name_hi, designation_en, designation_hi,
  specialization_en, specialization_hi, image_path, sort_order
)
WHERE p.slug = 'agricultural-economics-hisar';
