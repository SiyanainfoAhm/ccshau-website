/**
 * Homepage dignitaries and colleges sourced from https://hau.ac.in/ (June 2026).
 */

export interface LegacyDignitary {
  nameEn: string;
  nameHi: string;
  roleEn: string;
  roleHi: string;
  imageUrl: string;
}

export interface LegacyQuote {
  authorEn: string;
  authorHi: string;
  quoteEn: string;
  quoteHi: string;
}

export const legacyQuotes: LegacyQuote[] = [
  {
    authorEn: "Chaudhary Charan Singh",
    authorHi: "चौधरी चरण सिंह",
    quoteEn: "The prosperity of the nation passes through the fields and barns of villages.",
    quoteHi: "देश की समृद्धि का रास्ता गांवों के खेतों एवं खलिहानों से होकर गुजरता है।",
  },
  {
    authorEn: "Norman Borlaug",
    authorHi: "नॉर्मन बोरलॉग",
    quoteEn: "The first essential component of social justice is adequate food for all mankind.",
    quoteHi: "सामाजिक न्याय का पहला आवश्यक घटक सभी मानव जाति के लिए पर्याप्त भोजन है।",
  },
  {
    authorEn: "Dr. M. S. Swaminathan",
    authorHi: "डॉ. एम. एस. स्वामीनाथन",
    quoteEn: "If farm ecology and economics go wrong, nothing else will go right in agriculture.",
    quoteHi: "अगर फार्म इकोलॉजी और इकोनॉमिक्स गलत हो जाते हैं, तो कृषि में कुछ भी सही नहीं होगा।",
  },
];

export interface LegacyCollege {
  slug: string;
  /** Older CMS slugs that map to this legacy college */
  slugAliases?: string[];
  nameEn: string;
  nameHi: string;
  logoUrl: string;
  color: string;
}

export const legacyDignitaries: LegacyDignitary[] = [
  {
    nameEn: "Droupadi Murmu",
    nameHi: "द्रौपदी मुर्मू",
    roleEn: "Hon'ble President of India",
    roleHi: "भारत की माननीय राष्ट्रपति",
    imageUrl: "https://hau.ac.in/public/images/speakers/5/1662633138.jpg",
  },
  {
    nameEn: "Narendra Modi",
    nameHi: "नरेंद्र मोदी",
    roleEn: "Hon'ble Prime Minister of India",
    roleHi: "भारत के माननीय प्रधानमंत्री",
    imageUrl: "https://hau.ac.in/public/images/speakers/4/1662633149.jpg",
  },
  {
    nameEn: "Prof. Ashim Kumar Ghosh",
    nameHi: "प्रो. अशिम कुमार घोष",
    roleEn: "Hon'ble Governor of Haryana",
    roleHi: "हरियाणा के माननीय राज्यपाल",
    imageUrl: "https://hau.ac.in/public/images/speakers/3/1767765134.jpg",
  },
  {
    nameEn: "Nayab Singh Saini",
    nameHi: "नायब सिंह सैनी",
    roleEn: "Hon'ble Chief Minister of Haryana",
    roleHi: "हरियाणा के माननीय मुख्यमंत्री",
    imageUrl: "https://hau.ac.in/public/images/speakers/2/1722239329.jpeg",
  },
];

/** Order matches the legacy homepage carousel */
export const legacyColleges: LegacyCollege[] = [
  {
    slug: "college-of-agriculture-hisar",
    nameEn: "College of Agriculture, Hisar",
    nameHi: "कृषि महाविद्यालय, हिसार",
    logoUrl: "https://hau.ac.in/public/images/college/logo/2/1540803791.jpg",
    color: "from-rose-400 to-rose-500",
  },
  {
    slug: "college-of-agriculture-kaul",
    nameEn: "College of Agriculture, Kaul",
    nameHi: "कृषि महाविद्यालय, कौल",
    logoUrl: "https://hau.ac.in/public/images/college/logo/6/1540803865.jpg",
    color: "from-amber-400 to-orange-400",
  },
  {
    slug: "college-of-agriculture-bawal",
    nameEn: "College of Agriculture, Bawal",
    nameHi: "कृषि महाविद्यालय, बावल",
    logoUrl: "https://hau.ac.in/public/images/college/logo/7/1552737173.jpg",
    color: "from-sky-400 to-blue-400",
  },
  {
    slug: "centre-of-food-science-technology",
    slugAliases: ["centre-food-science-technology"],
    nameEn: "Centre of Food Science & Technology",
    nameHi: "खाद्य विज्ञान और प्रौद्योगिकी केंद्र",
    logoUrl: "https://hau.ac.in/public/images/college/logo/8/1547026866.jpg",
    color: "from-violet-400 to-purple-400",
  },
  {
    slug: "ic-college-of-home-science",
    slugAliases: ["ic-college-community-science"],
    nameEn: "I.C. College of Community Science",
    nameHi: "आई.सी. समुदाय विज्ञान महाविद्यालय",
    logoUrl: "https://hau.ac.in/public/images/college/logo/9/1741857160.jpg",
    color: "from-pink-400 to-rose-400",
  },
  {
    slug: "college-of-basic-sciences-humanities",
    nameEn: "College of Basic Sciences & Humanities",
    nameHi: "मूल विज्ञान और मानविकी महाविद्यालय",
    logoUrl: "https://hau.ac.in/public/images/college/logo/10/1540803999.jpg",
    color: "from-teal-400 to-cyan-400",
  },
  {
    slug: "college-of-agricultural-engineering-and-technology",
    slugAliases: ["college-agricultural-engineering-technology"],
    nameEn: "College of Agricultural Engineering and Technology",
    nameHi: "कृषि अभियांत्रिकी और प्रौद्योगिकी महाविद्यालय",
    logoUrl: "https://hau.ac.in/public/images/college/logo/11/1538048892.png",
    color: "from-indigo-400 to-blue-500",
  },
  {
    slug: "college-of-fisheries-science",
    slugAliases: ["college-fisheries-science"],
    nameEn: "College of Fisheries Science",
    nameHi: "मत्स्य विज्ञान महाविद्यालय",
    logoUrl: "https://hau.ac.in/public/images/college/logo/65/1716002752.png",
    color: "from-cyan-400 to-teal-500",
  },
  {
    slug: "college-of-biotechnology",
    slugAliases: ["college-biotechnology"],
    nameEn: "College of Biotechnology",
    nameHi: "जैव प्रौद्योगिकी महाविद्यालय",
    logoUrl: "https://hau.ac.in/public/images/college/logo/67/1782193277.jpg",
    color: "from-fuchsia-400 to-pink-500",
  },
];

export interface LegacyFlagship {
  slug: string;
  titleEn: string;
  titleHi: string;
  descEn: string;
  descHi: string;
  imageUrl: string;
}

/** Flagship initiatives carousel — https://hau.ac.in/ */
export const legacyFlagships: LegacyFlagship[] = [
  {
    slug: "agribusiness-incubation-centre",
    titleEn: "Agribusiness Incubation Centre",
    titleHi: "कृषि व्यवसाय इनक्यूबेशन केंद्र",
    descEn:
      "Agriculture is the primary sector of our economy and majority of the population is directly or indirectly dependent on it.",
    descHi:
      "कृषि हमारी अर्थव्यवस्था का प्राथमिक क्षेत्र है और अधिकांश जनसंख्या प्रत्यक्ष या अप्रत्यक्ष रूप से इस पर निर्भर है।",
    imageUrl: "https://hau.ac.in/public/images/college/banner/68/1689051816.JPG",
  },
  {
    slug: "centre-for-bio-nanotechnology",
    titleEn: "Centre for Bio-Nanotechnology",
    titleHi: "जैव-नैनो प्रौद्योगिकी केंद्र",
    descEn:
      "Centre for Bio-Nanotechnology was established at Chaudhary Charan Singh Haryana Agricultural University to advance research at the intersection of biology and nanotechnology.",
    descHi:
      "जैव-नैनो प्रौद्योगिकी केंद्र चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय में जीव विज्ञान और नैनो प्रौद्योगिकी के संगम पर अनुसंधान के लिए स्थापित किया गया।",
    imageUrl: "https://hau.ac.in/public/images/college/banner/66/1581499566.jpg",
  },
  {
    slug: "rkvy-raftaar-agribusiness-incubator-under-rkvy-raftaar-scheme",
    titleEn: "RKVY-RAFTAAR Agribusiness Incubator",
    titleHi: "आरकेवीवाई-रफ्तार कृषि व्यवसाय इनक्यूबेटर",
    descEn:
      "Agriculture is the primary sector of our economy and majority of the population is directly or indirectly dependent on it.",
    descHi:
      "कृषि हमारी अर्थव्यवस्था का प्राथमिक क्षेत्र है और अधिकांश जनसंख्या प्रत्यक्ष या अप्रत्यक्ष रूप से इस पर निर्भर है।",
    imageUrl: "https://hau.ac.in/public/images/college/banner/64/1555063867.JPG",
  },
  {
    slug: "institutional-development-plan-idp",
    titleEn: "Institutional Development Plan",
    titleHi: "संस्थागत विकास योजना",
    descEn:
      "Since its founding in 1970, Chaudhary Charan Singh Haryana Agricultural University (popularly known as HAU) has pursued excellence in teaching, research and extension.",
    descHi:
      "1970 में स्थापना के बाद से चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय (एचएयू) शिक्षा, अनुसंधान और विस्तार में उत्कृष्टता के लिए कार्यरत है।",
    imageUrl: "https://hau.ac.in/public/images/college/banner/44/1624419644.jpg",
  },
  {
    slug: "skill-council-of-india",
    titleEn: "Skill Council of India",
    titleHi: "स्किल काउंसिल ऑफ इंडिया",
    descEn:
      "Extension education is one of the three major functions of CCS Haryana Agricultural University, Hisar. The Skill Council of India initiative strengthens vocational training and outreach.",
    descHi:
      "विस्तार शिक्षा सीसीएस हरियाणा कृषि विश्वविद्यालय, हिसार के तीन प्रमुख कार्यों में से एक है। स्किल काउंसिल ऑफ इंडिया पहल व्यावसायिक प्रशिक्षण को मजबूत करती है।",
    imageUrl: "https://hau.ac.in/public/images/college/banner/43/1731475495.png",
  },
];
