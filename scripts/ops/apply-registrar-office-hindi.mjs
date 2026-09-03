#!/usr/bin/env node
/**
 * Apply Hindi translations for Registrar Office page (sidebar content + page title).
 * No external APIs — curated Cursor translations.
 *
 * Usage:
 *   node scripts/ops/apply-registrar-office-hindi.mjs          # dry-run
 *   node scripts/ops/apply-registrar-office-hindi.mjs --apply  # write to DB
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

const PAGE_ID = "5d364b79-2c02-4c42-b708-8cf78cf092b8";

const HOME_HI = `<div class="office-profile">
  <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/qMTteJ1Y5WaYgqNs1InqlrKemUdJtMbX0jSszoLD.jpeg" alt="डॉ. पवन कुमार" width="160" height="200" />
  <div>
    <p><strong>डॉ. पवन कुमार</strong></p>
    <p><strong>कुलसचिव</strong></p>
    <p><strong>मुख्य सतर्कता अधिकारी</strong></p>
  </div>
</div>
<div class="office-contact">
  <p><strong>दूरभाष:</strong></p>
  <p><strong>प्रवेश संबंधी पूछताछ — कार्यालय:</strong> +91 1662 255271, 255254</p>
  <hr />
  <p><strong>भर्ती संबंधी पूछताछ — कार्यालय:</strong> +91 1662 255224, 255154</p>
  <hr />
  <p><strong>कार्यालय:</strong> +91 1662 234613, +91 1662 255284, +91 1662 255294</p>
  <p><strong>फैक्स:</strong> +91 1662 284358</p>
  <p><strong>ई-मेल:</strong> <a href="mailto:regi@hau.ac.in">regi@hau.ac.in</a></p>
</div>`;

const SIDEBAR_CONTENT_HI = {
  "6ce732e2-787a-4625-aadd-3a10610af078": HOME_HI,
  "8978964d-e20a-42ed-b3c1-830dc0d78d8f": `<div class="office-profile">
  <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/biWvSGnaWc03nn4tLIpRfSQ1yIqOPUfuJdKi3Hr3.jpeg" alt="डॉ. वी. के. बत्रा" width="160" height="200" />
  <div>
    <p><strong>डॉ. वी. के. बत्रा</strong></p>
    <p><strong>सलाहकार (शैक्षणिक एवं संकाय मामले)</strong></p>
    <p><strong>दूरभाष संख्या</strong> 01662-255271</p>
  </div>
</div>
<div class="office-profile">
  <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/Ns8DXomJ6Fx4JqfKIw0tFx3Da8KSAtIsRj8Zkebu.jpeg" alt="श्री अजय आहूजा" width="160" height="200" />
  <div>
    <p><strong>श्री अजय आहूजा</strong></p>
    <p><strong>लेखा एवं प्रशासन अधिकारी</strong></p>
    <p><strong>दूरभाष संख्या</strong> 01662-255271</p>
  </div>
</div>
<div class="office-profile">
  <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/gY9tvjcWwqoEiEf7u0cHjbIIt27JNDx1OTAZ1p0c.jpeg" alt="डॉ. एम. के. गर्ग" width="160" height="200" />
  <div>
    <p><strong>डॉ. एम. के. गर्ग</strong></p>
    <p><strong>लोकपाल</strong></p>
    <p><strong>ई-मेल आईडी:</strong> <a href="mailto:mkgarg.hau@gmail.com">mkgarg.hau@gmail.com</a></p>
    <p><strong>दूरभाष संख्या</strong> +91 9416674060</p>
  </div>
</div>
<p>शैक्षणिक शाखा सभी स्नातक कार्यक्रमों के प्रवेश और परिणामों के लिए जिम्मेदार है। स्नातक तथा स्नातकोत्तर कार्यक्रमों के लिए प्रॉस्पेक्टस सामान्यतः प्रत्येक वर्ष मई/जून में शैक्षणिक परिषद की स्वीकृति के बाद जारी किया जाता है। स्नातक और स्नातकोत्तर एवं पीएच.डी. कार्यक्रमों में प्रवेश प्रत्येक वर्ष जुलाई में किया जाता है।</p>
<p>शैक्षणिक शाखा शैक्षणिक परिषद की बैठकों के आयोजन और दीक्षांत समारोहों के संचालन के लिए भी जिम्मेदार है।</p>
<p>स्नातक आवश्यकताओं की पूर्ति के बाद प्रत्येक छात्र को शैक्षणिक शाखा द्वारा डिग्री प्रदान की जाती है। अनुरोध पर स्थानांतरण प्रमाणपत्र भी जारी किए जाते हैं।</p>
<ul>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/7St33St4ZRUccersZnGSpbTJa1sMHjNgorjF37pX.pdf" target="_blank" rel="noopener noreferrer">मूल डिग्री प्रमाणपत्र का निर्गमन</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/oYeiABV5uphYPEPdl3MxnvYS75Ac6WO5SK6zufAX.pdf" target="_blank" rel="noopener noreferrer">डॉ. एम.के. गर्ग (सेवानिवृत्त प्रोफेसर) को विश्वविद्यालय के लोकपाल के रूप में नियुक्त</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/E3GweMvMrXLdcnj1qIeU5uCRWPYNRdehv5TZOsdv.pdf" target="_blank" rel="noopener noreferrer">शैक्षणिक कैलेंडर 2024-25</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/d7a26PicEP7ZoqVhzTNdGIx96LRsyvS6gkyJSMx7.pdf" target="_blank" rel="noopener noreferrer">शैक्षणिक परिषद और कार्यक्रमों की सूची</a></li>
</ul>`,
  "33f20ee4-2a70-4ddb-bc77-a5350f241522": `<p><strong>परीक्षा नियंत्रक</strong></p>
<div class="coe-officer">
  <div class="coe-officer__photo">
    <div class="coe-officer__photo-placeholder" aria-hidden="true">फोटो</div>
    <p class="coe-officer__name"><strong>डॉ. सुरेंद्र कुमार शर्मा</strong></p>
    <p class="coe-officer__role"><strong>परीक्षा नियंत्रक</strong></p>
  </div>
  <div class="coe-officer__contact">
    <p class="coe-officer__contact-title"><strong>डाक पता:</strong></p>
    <p>कक्ष संख्या 102, फ्लेचर भवन,</p>
    <p>चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय,</p>
    <p>हिसार-125004</p>
    <p>दूरभाष संख्या 91-1662-255310</p>
    <p>ई-मेल आईडी <a href="mailto:coe@hau.ac.in">coe@hau.ac.in</a></p>
  </div>
</div>
<p style="text-align:justify">परीक्षा नियंत्रक का कार्यालय सीसीएस एचएयू, हिसार में वर्ष 1999 में अस्तित्व में आया जब बी.एससी. (ऑनर्स) कृषि -4 वर्ष, बी.एससी. (ऑनर्स) कृषि - 6(2+4) वर्ष, बी.एससी. (ऑनर्स) सी.एससी. - 4 वर्ष, बी.एससी. (ऑनर्स) भौ.वि. -4 वर्ष, बी.एससी. (ऑनर्स) जीवन विज्ञान - 4 वर्ष, बी.टेक. (कृषि अभियांत्रिकी), बी.टेक. (जैव प्रौद्योगिकी), बी.एफ.एससी. और एमबीए कार्यक्रमों के लिए बाह्य परीक्षा प्रणाली लागू की गई। विभिन्न स्नातक और स्नातकोत्तर कार्यक्रमों में प्रवेश हेतु प्रवेश परीक्षाओं के संचालन के लिए जिम्मेदार। यह केंद्रीय फ्लाइंग स्क्वाड और यूएमसी की उच्च स्तरीय समिति के साथ समन्वय भी करता है, जिसमें अंतिम परीक्षाओं तथा प्रवेश परीक्षा से संबंधित निम्नलिखित कार्य शामिल हैं:-</p>
<p><strong>गोपनीयता</strong></p>
<ul>
  <li>प्रश्न पत्र निर्धारण</li>
  <li>टाइपिंग</li>
  <li>प्रूफ रीडिंग</li>
  <li>मुद्रण</li>
  <li>सेट निर्माण</li>
</ul>
<p><strong>संचालन</strong></p>
<ul>
  <li>स्नातक एवं स्नातकोत्तर प्रवेश परीक्षाएँ</li>
  <li>बाह्य परीक्षाएँ
    <ol>
      <li>बी.एससी. (ऑनर्स) कृषि - 4 वर्ष</li>
      <li>बी.एससी. (ऑनर्स) कृषि – 6(2+4) वर्ष</li>
      <li>बी.एससी. (ऑनर्स) सी.एससी. - 4 वर्ष</li>
      <li>बी.एससी. (ऑनर्स) भौ.वि. - 4 वर्ष</li>
      <li>बी.एससी. (ऑनर्स) जीवन विज्ञान - 4 वर्ष</li>
      <li>बी.टेक. (कृषि अभियांत्रिकी)</li>
      <li>बी.टेक. (जैव प्रौद्योगिकी)</li>
      <li>बी.एफ.एससी.</li>
      <li>एमबीए</li>
    </ol>
  </li>
</ul>
<p><strong>परिणाम</strong></p>
<ul>
  <li>उत्तर पुस्तिकाओं/ओएमआर शीटों का मूल्यांकन</li>
  <li>परिणाम का संकलन/सारणीकरण</li>
</ul>
<p><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/VNAnr9xSARRHWdjuAirucud8gwwu947SK5MH7nmP.pdf"><strong>माननीय कुलपति डॉ. बी.आर. कंबोज, प्रवेश परीक्षा-2025 की निगरानी</strong></a></p>`,
  "cb7fb22f-a581-4d64-a413-0875f3812467": `<div class="office-profile">
  <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/ani4FyJcEs93yAh8YCKSbCD4D4QhoGImMJrLbF9b.jpeg" alt="श्री तारा चंद" width="160" height="200" />
  <div>
    <p><strong>श्री तारा चंद</strong></p>
    <p><strong>सहायक कुलसचिव (कर्मचारी शाखा)</strong></p>
    <p><strong>ई-मेल आईडी:</strong> <a href="mailto:establishmentbranchhau@gmail.com">establishmentbranchhau@gmail.com</a></p>
    <p><strong>दूरभाष संख्या</strong> 01662-255232</p>
  </div>
</div>
<p><strong>कर्मचारी शाखा के मुख्य कार्य निम्नलिखित हैं:</strong></p>
<ol type="A">
  <li>गैर-शिक्षण कर्मचारियों के संबंध में परिवीक्षा अवधि पूर्णता, पदोन्नति और अन्य सेवा मामलों सहित अनुशासनात्मक कार्यवाही के मामले, जिनमें नियुक्ति प्राधिकारी या तो कुलपति या कुलसचिव हो।</li>
  <li>गैर-शिक्षण कर्मचारियों के सेवा मामलों के संबंध में विभिन्न नियुक्ति प्राधिकारियों को सलाह प्रदान करना।</li>
  <li>गैर-शिक्षण कर्मचारियों के सेवा मामलों से संबंधित निर्देश/दिशानिर्देश जारी करना।</li>
  <li>वित्तीय सहानुभूति सहायता और मृतक कर्मचारियों के आश्रितों को दानवश नियुक्ति के मामलों से निपटना।</li>
  <li>मंत्रालय कर्मचारियों के लिए लेखा में विभागीय परीक्षा और सचिवालय कर्मचारियों के लिए शॉर्टहैंड परीक्षा का संचालन।</li>
  <li>कर्मचारी संघों से संबंधित मामलों से निपटना।</li>
  <li>गैर-शिक्षण कर्मचारियों से संबंधित वैधानिक प्रावधानों में संशोधन।</li>
  <li>वार्षिक गोपनीय प्रतिवेदन लेखन संबंधी निर्देशों से निपटना।</li>
  <li>सरदार पटेल पुरस्कार (गैर-शिक्षण कर्मचारी) से संबंधित मामले।</li>
  <li>एचआरएमएस पोर्टल पर गैर-शिक्षण कर्मचारियों के स्थानांतरण की जानकारी अद्यतन करना, जिनका नियुक्ति प्राधिकारी कुलपति/कुलसचिव है।</li>
</ol>`,
  "37f9d7bf-a68c-4e25-af99-623119ee83c2": `<div class="office-profile">
  <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/biWvSGnaWc03nn4tLIpRfSQ1yIqOPUfuJdKi3Hr3.jpeg" alt="डॉ. वी. के. बत्रा" width="160" height="200" />
  <div>
    <p><strong>डॉ. वी. के. बत्रा</strong></p>
    <p><strong>सलाहकार (शैक्षणिक एवं संकाय मामले)</strong></p>
    <p><strong>दूरभाष संख्या</strong> 01662-255219</p>
  </div>
</div>
<div class="office-profile">
  <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/Fec84uaTfrcZshn2f7qJ6pYI5jjoNkZLSuppkOT6.jpeg" alt="श्री राज कुमार मेहता" width="160" height="200" />
  <div>
    <p><strong>श्री राज कुमार मेहता</strong></p>
    <p><strong>सहायक कुलसचिव</strong></p>
    <p><strong>दूरभाष संख्या</strong> 01662-25521</p>
  </div>
</div>
<p><strong>संकाय शाखा निम्नलिखित से संबंधित है:</strong></p>
<ol>
  <li>शिक्षकों के स्थापना मामले अर्थात् सहायक प्रोफेसर, एसोसिएट प्रोफेसर, प्रोफेसर सहित विभागाध्यक्ष, डीन, निदेशक और विश्वविद्यालय के अधिकारी। इसमें स्थानांतरण, वरिष्ठता, अनुशासनात्मक कार्यवाही और अन्य संबद्ध कार्य शामिल हैं।</li>
  <li>शिक्षकों की पदोन्नति अर्थात् वरिष्ठ पैमाने, चयन श्रेणी, एसोसिएट प्रोफेसर, करियर उन्नयन योजना और योग्यता पदोन्नति योजना के अंतर्गत प्रोफेसर।</li>
  <li>विभागाध्यक्षों की नियुक्ति।</li>
  <li>प्रबंध परिषद की बैठकों का संचालन और उसके निर्णयों का क्रियान्वयन।</li>
</ol>
<ul>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/lL7Cbj1uPSLVcsGTijrWnNcyHGAqBXcoWgmSBpUB.pdf" target="_blank" rel="noopener noreferrer">विश्वविद्यालय स्तरीय प्रोफेसरों (प्रत्यक्ष भर्ती और व्यक्तिगत पदोन्नति) की सूची का अंतिम रूप, जिन्होंने 01.01.2020 से 31.12.2020 तक प्रोफेसर/समकक्ष के रूप में 10 वर्ष की सेवा पूरी की</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/Pxnn3GLCrP1rc3m6l1VRLhEI5q1TVtBiM87OdY6a.pdf" target="_blank" rel="noopener noreferrer">प्रोफेसरों/समकक्षों (प्रत्यक्ष भर्ती तथा पदोन्नत) के दस प्रतिशत के करियर उन्नयन के लिए पात्रता, जिन्होंने प्रोफेसर/समकक्ष के रूप में 10 वर्ष की सेवा पूरी की (चरण V) से वरिष्ठ प्रोफेसर/समकक्ष (चरण VI) में रु. 12000 के उच्चतर वेतनमान में</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/qrlYYnVFMi0pLSZanKe8Ab8UrNsrC7JLCnTcpJFR.pdf" target="_blank" rel="noopener noreferrer">शुद्धिपत्र — वरिष्ठ प्रोफेसरों की विश्वविद्यालय स्तरीय वरिष्ठता सूची</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/Qxs06npLTQNFTwST6IkWxBIbFlDtTarCEHVPEFkU.pdf" target="_blank" rel="noopener noreferrer">31.12.2019 तक प्रोफेसर/समकक्ष के रूप में 10 वर्ष या अधिक सेवा वाले विश्वविद्यालय स्तरीय प्रोफेसरों की अंतिम वरिष्ठता सूची, करियर उन्नयन योजना के अंतर्गत वरिष्ठ प्रोफेसर के रूप में पदोन्नति हेतु</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/oNwwjlT98gK7NOWkX3ZgD2ite4eZEQip4wOFbtx2.pdf" target="_blank" rel="noopener noreferrer">01.01.2020 से 31.12.2020 तक 10 वर्ष की सेवा पूर्ण करने वाले विश्वविद्यालय स्तरीय प्रोफेसरों/समकक्षों (प्रत्यक्ष भर्ती और व्यक्तिगत पदोन्नति) की अस्थायी सूची</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/rE1NAMMOifUgCQZvGxpkEYHYrqy0E4uJpWJfvx9z.pdf" target="_blank" rel="noopener noreferrer">01.01.2020 से 31.12.2020 तक 10 वर्ष की सेवा पूर्ण करने वाले विश्वविद्यालय स्तरीय प्रोफेसरों/समकक्षों (प्रत्यक्ष भर्ती और व्यक्तिगत पदोन्नति) की अस्थायी सूची में सुधार</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/aR9x37164W7gDYOnh5WIYEKwWPAhgI21zP8TllbP.pdf" target="_blank" rel="noopener noreferrer">10 वर्ष के अनुभव वाले विश्वविद्यालय स्तरीय प्रोफेसरों की अंतिम वरिष्ठता सूची के लिए शुद्धिपत्र</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/w7kDoDoEehCElaBTdyncMprdakgXCqsXyxQX6pEz.pdf" target="_blank" rel="noopener noreferrer">मुख्य गतिविधि — सेवाएँ/तकनीकी प्रशासन</a></li>
</ul>`,
  "fd2f95f6-bad3-491c-836b-84da9e2ff31a": `<div class="office-profile">
  <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/tSDMI2g2IlLYAjdvUiWGubvzJ7W6H5mh1n5yguP1.jpeg" alt="डॉ. अंशुल" width="160" height="200" />
  <div>
    <p><strong>डॉ. अंशुल</strong></p>
    <p><strong>उप कुलसचिव (सामान्य शाखा)</strong></p>
    <p><strong>ई-मेल आईडी:</strong> <a href="mailto:arga@hau.ac.in">arga@hau.ac.in</a></p>
    <p><strong>दूरभाष संख्या</strong> 01662-255110</p>
  </div>
</div>
<p><strong>यह शाखा निम्नलिखित से संबंधित है:</strong></p>
<ul>
  <li>सीएम शिकायत पोर्टल (सीएम विंडो), सीपीग्राम्स पोर्टल, जन संवाद पोर्टल के माध्यम से शिकायतों की निगरानी।</li>
  <li>अधिकारियों की समिति की बैठकों का संचालन।</li>
  <li>आरटीआई अधिनियम, 2005 के अंतर्गत निर्देशों का अनुपालन और राज्य सूचना अधिकारियों की नियुक्ति।</li>
  <li>विविध कार्य जिसमें सीसीएस एचएयू से संबंधित भारत सरकार/आईसीएआर/यूजीसी/राज्य सरकार द्वारा मांगी गई जानकारी का संकलन और प्रेषण, चुनाव कार्य, सीसीएस एचएयू के वाहनों के गेट पास/स्टिकर का निर्गमन शामिल है।</li>
  <li>कार्यस्थलों पर महिलाओं के यौन उत्पीड़न के मामलों पर विचार हेतु आंतरिक शिकायत समिति के गठन, कल्याण अधिकारी की नियुक्ति और आवास आवंटन समिति के गठन के अलावा कृषि सलाहकार समिति आदि से संबंधित मामले।</li>
  <li>सीसीएस एचएयू अधिनियम और संविधि का मुद्रण/संशोधन।</li>
  <li>मुख्य सतर्कता अधिकारी/विविध शिकायतों से संबंधित मामलों से निपटना।</li>
  <li>जिला प्रशासन से वाहनों की मांग।</li>
</ul>`,
  "619ce9d3-55c8-4e82-a40d-6ab76395c23e": `<div class="office-profile">
  <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/5p8n2Hu9wTN6A8YIiJcrHj5SJcAaxmt9dKLg70Dw.jpeg" alt="श्री कपिल अरोड़ा" width="160" height="200" />
  <div>
    <p><strong>श्री कपिल अरोड़ा</strong></p>
    <p><strong>प्रभारी (कानूनी प्रकोष्ठ)</strong></p>
    <p><strong>ई-मेल आईडी:</strong> <a href="mailto:haulegalcell@gmail.com">haulegalcell@gmail.com</a></p>
    <p><strong>दूरभाष संख्या</strong> 01662-255301</p>
  </div>
</div>
<p>कानूनी प्रकोष्ठ की स्थापना वर्ष 2001 में की गई और यह कुलसचिव कार्यालय में प्रभारी, कानूनी प्रकोष्ठ एवं नोडल अधिकारी की देखरेख में कार्य कर रहा है। कानूनी प्रकोष्ठ विश्वविद्यालय को कानूनी सेवाएँ और सलाह प्रदान करने के लिए जिम्मेदार है। यह प्रकोष्ठ विभिन्न कानूनी मामलों से निपटता है। इनमें शिक्षण और गैर-शिक्षण कर्मचारियों से संबंधित मामले, छात्रों से संबंधित मामले और आवास आदि से संबंधित अन्य मामले शामिल हैं। ये सभी गतिविधियाँ कानूनी प्रकोष्ठ के कार्यप्रवाह का निर्माण करती हैं। कानूनी प्रकोष्ठ के निम्नलिखित मुख्य कार्य देखे जा सकते हैं:</p>
<ul>
  <li>विश्वविद्यालय के विरुद्ध/द्वारा दायर न्यायालयीन मामलों का बचाव/निगरानी।</li>
  <li>कानूनी नोटिस, प्रारूप शो-कॉज़ नोटिस, कर्मचारियों पर तामील किए जाने वाले आरोप-पत्रों की जाँच।</li>
  <li>संकाय सदस्यों, गैर-शिक्षण कर्मचारियों और छात्रों के विरुद्ध विभिन्न मामलों पर कानूनी राय प्रदान करना।</li>
  <li>पैनल वकीलों के प्रदर्शन की निगरानी और नए पैनलों के गठन पर सलाह देना।</li>
  <li>मामलों की प्रकृति और महत्व को ध्यान में रखते हुए विभिन्न पैनल वकीलों को न्यायालयीन मामले सौंपना।</li>
  <li>वकीलों के विभिन्न बिलों का प्रसंस्करण और शुल्क का निपटान आदि।</li>
  <li>आरटीआई अधिनियम के अंतर्गत प्रथम अपील प्राधिकारी का कार्य भी इस प्रकोष्ठ द्वारा देखा जाता है।</li>
  <li>माननीय कुलपति, सीसीएस एचएयू, हिसार द्वारा सौंपा गया कोई अन्य कर्तव्य/कार्य।</li>
</ul>`,
  "5ff3b270-ff1f-4f8a-b279-03c81343b9a1": `<div class="office-profile">
  <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/JYdNtnsgjt7C6T33I78wpHnf8woE6aGSqjP12npW.jpeg" alt="डॉ. वी. के. बत्रा" width="160" height="200" />
  <div>
    <p><strong>डॉ. वी. के. बत्रा</strong></p>
    <p><strong>सलाहकार (भर्ती प्रकोष्ठ)</strong></p>
    <p><strong>दूरभाष संख्या</strong> 01662-255224, 01662-255154</p>
    <p><strong>ई-मेल आईडी:</strong> <a href="mailto:advisor.rc@gmail.com">advisor.rc@gmail.com</a></p>
  </div>
</div>
<div class="office-profile">
  <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/fgjv0YK7X5g2Y8eM9BZgdX26ySJk5pVOuAQXEwad.jpeg" alt="श्री रमेश चंदर" width="160" height="200" />
  <div>
    <p><strong>श्री रमेश चंदर</strong></p>
    <p><strong>लेखा एवं प्रशासन अधिकारी</strong></p>
    <p><strong>दूरभाष संख्या</strong> 01662-255224, 01662-255154</p>
    <p><strong>ई-मेल आईडी:</strong> <a href="mailto:advisor.rc@gmail.com">advisor.rc@gmail.com</a></p>
  </div>
</div>
<p><strong>यह शाखा निम्नलिखित से संबंधित है:</strong></p>
<ul>
  <li>विश्वविद्यालय के डीन/निदेशक/अधिकारियों की भर्ती।</li>
  <li>सभी शिक्षण पदों की भर्ती।</li>
  <li>सभी गैर-शिक्षण द्वितीय श्रेणी और उससे ऊपर के पदों की भर्ती।</li>
  <li>सभी गैर-शिक्षण तृतीय एवं चतुर्थ श्रेणी के पदों की भर्ती, जिनमें कुलपति/कुलसचिव नियुक्ति प्राधिकारी हैं।</li>
  <li>संविधि में निर्धारित प्रक्रिया के अनुसार भर्ती। पदों का प्रमुख समाचार पत्रों में विज्ञापन किया जाता है और संविधि में निहित प्रावधानों के अनुसार उचित रूप से गठित समिति द्वारा चयन किया जाता है।</li>
  <li>वेतन संरक्षण/पुनः रोजगार, शिक्षण/गैर-शिक्षण और आउटसोर्सिंग सेवाओं के संबंध में सरकारी नीतियों/परिपत्रों को अपनाने और अन्य विविध कार्यों से निपटना।</li>
  <li>अस्थायी कर्मचारियों तथा डीपीएल से संबंधित मामले।</li>
  <li>अधिकारियों/शिक्षण/गैर-शिक्षण पदों की भर्ती से संबंधित वैधानिक प्रावधानों में संशोधन।</li>
  <li>संकाय क्लब सलाहकार समिति का गठन।</li>
</ul>`,
};

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  const { data: sidebars, error } = await supabase
    .from("ccshau_page_sidebar_items")
    .select("id, label_en, content_hi")
    .eq("page_id", PAGE_ID)
    .order("sort_order");

  if (error) throw error;

  const missing = sidebars.filter((s) => !SIDEBAR_CONTENT_HI[s.id]);
  if (missing.length > 0) {
    console.error("Missing translations for:", missing.map((m) => m.label_en).join(", "));
    process.exit(1);
  }

  console.log(`Page: registrar-office (${PAGE_ID})`);
  console.log(`Sidebar items to update: ${sidebars.length}`);
  console.log(`Page title_hi: कुलसचिव कार्यालय`);
  console.log(`Page content_hi: (home profile)`);

  if (!APPLY) {
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  const { error: pageErr } = await supabase
    .from("ccshau_pages")
    .update({
      title_hi: "कुलसचिव कार्यालय",
      excerpt_hi: "कुलसचिव कार्यालय — सीसीएस एचएयू।",
      content_hi: HOME_HI.replace(/\r?\n/g, "\r\n"),
    })
    .eq("id", PAGE_ID);
  if (pageErr) throw pageErr;

  let updated = 0;
  for (const item of sidebars) {
    const contentHi = SIDEBAR_CONTENT_HI[item.id].replace(/\r?\n/g, "\r\n");
    const { error: upErr } = await supabase
      .from("ccshau_page_sidebar_items")
      .update({ content_hi: contentHi })
      .eq("id", item.id);
    if (upErr) throw upErr;
    updated++;
    console.log(`  ✓ ${item.label_en}`);
  }

  console.log(`\nApplied ${updated} sidebar content_hi + page title/content.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
