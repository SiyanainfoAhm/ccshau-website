-- Homepage CMS — quotes, dignitaries, flagships (initiatives), farmers portal CTA

CREATE TABLE IF NOT EXISTS ccshau_homepage_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_en text NOT NULL,
  author_hi text,
  quote_en text NOT NULL,
  quote_hi text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ccshau_homepage_dignitaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_hi text,
  role_en text NOT NULL,
  role_hi text,
  image_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ccshau_homepage_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_hi text,
  description_en text NOT NULL,
  description_hi text,
  image_path text NOT NULL,
  link_slug text,
  link_href text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ccshau_homepage_cta (
  id integer PRIMARY KEY DEFAULT 1,
  title_en text NOT NULL,
  title_hi text,
  subtitle_en text,
  subtitle_hi text,
  button_en text NOT NULL DEFAULT 'Click Here',
  button_hi text,
  link_href text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ccshau_homepage_cta_singleton CHECK (id = 1)
);

COMMENT ON TABLE ccshau_homepage_quotes IS 'CCSHAU_ rotating quotes on homepage';
COMMENT ON TABLE ccshau_homepage_dignitaries IS 'CCSHAU_ dignitaries carousel on homepage';
COMMENT ON TABLE ccshau_homepage_initiatives IS 'CCSHAU_ flagships / initiatives carousel on homepage';
COMMENT ON TABLE ccshau_homepage_cta IS 'CCSHAU_ farmers portal CTA band on homepage';

CREATE TRIGGER ccshau_trg_homepage_quotes_updated_at
  BEFORE UPDATE ON ccshau_homepage_quotes
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TRIGGER ccshau_trg_homepage_dignitaries_updated_at
  BEFORE UPDATE ON ccshau_homepage_dignitaries
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TRIGGER ccshau_trg_homepage_initiatives_updated_at
  BEFORE UPDATE ON ccshau_homepage_initiatives
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

CREATE TRIGGER ccshau_trg_homepage_cta_updated_at
  BEFORE UPDATE ON ccshau_homepage_cta
  FOR EACH ROW EXECUTE FUNCTION ccshau_set_updated_at();

ALTER TABLE ccshau_homepage_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_homepage_dignitaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_homepage_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccshau_homepage_cta ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccshau_pol_homepage_quotes_select_active
  ON ccshau_homepage_quotes FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY ccshau_pol_homepage_dignitaries_select_active
  ON ccshau_homepage_dignitaries FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY ccshau_pol_homepage_initiatives_select_active
  ON ccshau_homepage_initiatives FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY ccshau_pol_homepage_cta_select_active
  ON ccshau_homepage_cta FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY ccshau_pol_homepage_quotes_select_authenticated
  ON ccshau_homepage_quotes FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_homepage_dignitaries_select_authenticated
  ON ccshau_homepage_dignitaries FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_homepage_initiatives_select_authenticated
  ON ccshau_homepage_initiatives FOR SELECT TO authenticated USING (true);

CREATE POLICY ccshau_pol_homepage_cta_select_authenticated
  ON ccshau_homepage_cta FOR SELECT TO authenticated USING (true);

-- Seed from legacy hau.ac.in homepage (safe to re-run)

INSERT INTO ccshau_homepage_quotes (author_en, author_hi, quote_en, quote_hi, sort_order)
SELECT v.author_en, v.author_hi, v.quote_en, v.quote_hi, v.sort_order
FROM (
  VALUES
    (
      'Chaudhary Charan Singh',
      'चौधरी चरण सिंह',
      'The prosperity of the nation passes through the fields and barns of villages.',
      'देश की समृद्धि का रास्ता गांवों के खेतों एवं खलिहानों से होकर गुजरता है।',
      1
    ),
    (
      'Norman Borlaug',
      'नॉर्मन बोरलॉग',
      'The first essential component of social justice is adequate food for all mankind.',
      'सामाजिक न्याय का पहला आवश्यक घटक सभी मानव जाति के लिए पर्याप्त भोजन है।',
      2
    ),
    (
      'Dr. M. S. Swaminathan',
      'डॉ. एम. एस. स्वामीनाथन',
      'If farm ecology and economics go wrong, nothing else will go right in agriculture.',
      'अगर फार्म इकोलॉजी और इकोनॉमिक्स गलत हो जाते हैं, तो कृषि में कुछ भी सही नहीं होगा।',
      3
    )
) AS v(author_en, author_hi, quote_en, quote_hi, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM ccshau_homepage_quotes LIMIT 1);

INSERT INTO ccshau_homepage_dignitaries (name_en, name_hi, role_en, role_hi, image_path, sort_order)
SELECT v.name_en, v.name_hi, v.role_en, v.role_hi, v.image_path, v.sort_order
FROM (
  VALUES
    (
      'Droupadi Murmu',
      'द्रौपदी मुर्मू',
      'Hon''ble President of India',
      'भारत की माननीय राष्ट्रपति',
      'https://hau.ac.in/public/images/speakers/5/1662633138.jpg',
      1
    ),
    (
      'Narendra Modi',
      'नरेंद्र मोदी',
      'Hon''ble Prime Minister of India',
      'भारत के माननीय प्रधानमंत्री',
      'https://hau.ac.in/public/images/speakers/4/1662633149.jpg',
      2
    ),
    (
      'Prof. Ashim Kumar Ghosh',
      'प्रो. अशिम कुमार घोष',
      'Hon''ble Governor of Haryana',
      'हरियाणा के माननीय राज्यपाल',
      'https://hau.ac.in/public/images/speakers/3/1767765134.jpg',
      3
    ),
    (
      'Nayab Singh Saini',
      'नायब सिंह सैनी',
      'Hon''ble Chief Minister of Haryana',
      'हरियाणा के माननीय मुख्यमंत्री',
      'https://hau.ac.in/public/images/speakers/2/1722239329.jpeg',
      4
    )
) AS v(name_en, name_hi, role_en, role_hi, image_path, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM ccshau_homepage_dignitaries LIMIT 1);

INSERT INTO ccshau_homepage_initiatives (
  title_en, title_hi, description_en, description_hi, image_path, link_slug, sort_order
)
SELECT v.title_en, v.title_hi, v.description_en, v.description_hi, v.image_path, v.link_slug, v.sort_order
FROM (
  VALUES
    (
      'Agribusiness Incubation Centre',
      'कृषि व्यवसाय इनक्यूबेशन केंद्र',
      'Agriculture is the primary sector of our economy and majority of the population is directly or indirectly dependent on it.',
      'कृषि हमारी अर्थव्यवस्था का प्राथमिक क्षेत्र है और अधिकांश जनसंख्या प्रत्यक्ष या अप्रत्यक्ष रूप से इस पर निर्भर है।',
      'https://hau.ac.in/public/images/college/banner/68/1689051816.JPG',
      'agribusiness-incubation-centre',
      1
    ),
    (
      'Centre for Bio-Nanotechnology',
      'जैव-नैनो प्रौद्योगिकी केंद्र',
      'Centre for Bio-Nanotechnology was established at CCS HAU to advance research at the intersection of biology and nanotechnology.',
      'जैव-नैनो प्रौद्योगिकी केंद्र सीसीएसएचएयू में जीव विज्ञान और नैनो प्रौद्योगिकी पर अनुसंधान के लिए स्थापित किया गया।',
      'https://hau.ac.in/public/images/college/banner/66/1581499566.jpg',
      'centre-for-bio-nanotechnology',
      2
    ),
    (
      'RKVY-RAFTAAR Agribusiness Incubator',
      'आरकेवीवाई-रफ्तार कृषि व्यवसाय इनक्यूबेटर',
      'Agriculture is the primary sector of our economy and majority of the population is directly or indirectly dependent on it.',
      'कृषि हमारी अर्थव्यवस्था का प्राथमिक क्षेत्र है और अधिकांश जनसंख्या प्रत्यक्ष या अप्रत्यक्ष रूप से इस पर निर्भर है।',
      'https://hau.ac.in/public/images/college/banner/64/1555063867.JPG',
      'rkvy-raftaar-agribusiness-incubator-under-rkvy-raftaar-scheme',
      3
    ),
    (
      'Institutional Development Plan',
      'संस्थागत विकास योजना',
      'Since its founding in 1970, CCS HAU has pursued excellence in teaching, research and extension.',
      '1970 में स्थापना के बाद से सीसीएसएचएयू शिक्षा, अनुसंधान और विस्तार में उत्कृष्टता के लिए कार्यरत है।',
      'https://hau.ac.in/public/images/college/banner/44/1624419644.jpg',
      'institutional-development-plan-idp',
      4
    ),
    (
      'Skill Council of India',
      'स्किल काउंसिल ऑफ इंडिया',
      'Extension education is a major function of CCS HAU — vocational training and outreach across Haryana.',
      'विस्तार शिक्षा सीसीएसएचएयू का प्रमुख कार्य है — हरियाणा भर में व्यावसायिक प्रशिक्षण और जन-जागरूकता।',
      'https://hau.ac.in/public/images/college/banner/43/1731475495.png',
      'skill-council-of-india',
      5
    )
) AS v(title_en, title_hi, description_en, description_hi, image_path, link_slug, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM ccshau_homepage_initiatives LIMIT 1);

INSERT INTO ccshau_homepage_cta (
  id, title_en, title_hi, subtitle_en, subtitle_hi, button_en, button_hi, link_href
)
VALUES (
  1,
  'Farmers'' Portal',
  'किसान पोर्टल',
  'Crop advisories, extension services and farmer-focused resources from CCSHAU Hisar',
  'सीसीएसएचएयू हिसार से फसल सलाह, विस्तार सेवाएं और किसान-केंद्रित संसाधन',
  'Click Here',
  'यहाँ क्लिक करें',
  '/pages/about'
)
ON CONFLICT (id) DO NOTHING;
