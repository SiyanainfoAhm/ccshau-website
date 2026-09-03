#!/usr/bin/env node
/**
 * Apply Hindi translations for Comptroller Office sidebar tabs missing content_hi.
 * No external APIs — curated Cursor translations.
 *
 * Usage:
 *   node scripts/ops/apply-comptroller-office-hindi.mjs          # dry-run
 *   node scripts/ops/apply-comptroller-office-hindi.mjs --apply  # write to DB
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");

const PAGE_ID = "5f8ed59b-17ca-458d-b7e1-3aa5beed51a8";

const HOME_HI = `<div class="office-profile">
  <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/AmSHuZXw61lAm7wSfL1B6exG0SXpTqRUoWQ3R1rh.jpeg" alt="श्री नवीन जैन" width="160" height="200" />
  <div>
    <p><strong>श्री नवीन जैन</strong></p>
    <p><strong>नियंत्रक</strong></p>
    <p>प्रथम तल, फ्लेचर भवन, सीसीएसएचएयू</p>
    <p><strong>दूरभाष — कार्यालय:</strong> 01662-284305</p>
    <p><strong>ईपीएबीएक्स:</strong> 5280</p>
    <p><strong>फैक्स:</strong> 01662-289575</p>
    <p><strong>ई-मेल:</strong> <a href="mailto:comptroller@hau.ac.in">comptroller@hau.ac.in</a>, <a href="mailto:comptrollerhau@gmail.com">comptrollerhau@gmail.com</a></p>
  </div>
</div>
<p>नियंत्रक विश्वविद्यालय का पूर्णकालिक अधिकारी होता है। वह विश्वविद्यालय के वित्त और निवेश का प्रबंधन करता है और इसके वित्तीय मामलों के संबंध में सलाह देता है। वह बजट की तैयारी और प्रस्तुति के लिए जिम्मेदार है और यह सुनिश्चित करता है कि बजट में अधिकृत व्यय विश्वविद्यालय में न किया जाए। वह विश्वविद्यालय के लेखे तैयार करने और उनका लेखा परीक्षण कराने के लिए जिम्मेदार है। वह वित्त समिति के सदस्य सचिव भी है। उसे यह सुनिश्चित करना होता है कि विश्वविद्यालय को देय सभी आय और शुल्क समय पर एकत्रित कर बैंक खाते में जमा किए जाएँ।</p>
<p>विश्वविद्यालय के वित्तीय प्रबंधन के लिए विभिन्न प्रकार के कार्यों को निष्पादित करने में नियंत्रक की सहायता करने वाली पाँच शाखाएँ और दो कक्ष हैं। ये हैं (i) बजट शाखा (ii) लेखा शाखा (iii) स्थापना शाखा (iv) निरीक्षण शाखा (v) पेंशन शाखा। दो कक्ष हैं (i) सेवानिवृत्त कक्ष (ii) आउटसोर्सिंग कक्ष। इसके अलावा, नियंत्रक भंडार खरीद संगठन का नियंत्रण अधिकारी है।</p>`;

const SPO_HI = `<div class="office-leadership-grid">
  <div class="office-profile office-profile-compact">
    <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/FjCJzFmwxaCGcpt8AxqeqJWrngTMpKjZxn86phJi.jpeg" alt="डॉ. पवन कुमार" width="140" height="180" />
    <div>
      <p><strong>डॉ. पवन कुमार</strong></p>
      <p>सीपीसी अध्यक्ष</p>
    </div>
  </div>
  <div class="office-profile office-profile-compact">
    <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/o3ZsiGz7TbUHt6ifjLcjEHlM55opNt6c6J2yPXFV.jpeg" alt="श्री नवीन जैन" width="140" height="180" />
    <div>
      <p><strong>श्री नवीन जैन</strong></p>
      <p>नियंत्रक</p>
    </div>
  </div>
  <div class="office-profile office-profile-compact">
    <img src="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/USvVSjFbrAcozqZSU1MWP5uyGxXLUOPSVBPnrcBt.jpeg" alt="डॉ. अनिल कुमार" width="140" height="180" />
    <div>
      <p><strong>डॉ. अनिल कुमार</strong></p>
      <p>एसपीओ निदेशक</p>
    </div>
  </div>
</div>
<div class="office-contact">
  <p><strong>स्थान:</strong> भंडार खरीद संगठन, पुराना परिसर, सीसीएस एचएयू, हिसार - 125 004</p>
  <p><strong>डाक पता:</strong><br />
    निदेशक (भंडार एवं खरीद),<br />
    भंडार खरीद संगठन,<br />
    पुराना परिसर, सीसीएस एचएयू, हिसार।</p>
  <p><strong>दूरभाष संख्या:</strong> 01662-284317, 255419</p>
  <p><strong>ई-मेल:</strong> <a href="mailto:directorspo@gmail.com">directorspo@gmail.com</a>, <a href="mailto:spo@hau.ac.in">spo@hau.ac.in</a></p>
</div>
<p>भंडार खरीद संगठन उन वस्तुओं के भंडार का रखरखाव करता है जिनकी आवश्यकता विभिन्न विभागों/कार्यालयों को दैनिक उपयोग में होती है। संगठन केंद्रीकृत तथा गैर-केंद्रीकृत वस्तुओं के सभी खरीद मामलों से भंडार खरीद प्रक्रिया के अंतर्गत निर्धारित नियमों के अनुसार निपटता है। विभागों/कार्यालयों द्वारा आवश्यक उन वस्तुओं के खरीद मामले, जो संगठन के पास उपलब्ध नहीं हैं, से भी निपटा जाता है। भंडार खरीद संगठन की प्रमुख गतिविधियाँ वार्षिक दर अनुबंध, रखरखाव अनुबंध, केंद्रीय भंडार का पुनःपूर्ति करना और प्रत्येक वर्ष अप्रैल में कुलपति द्वारा गठित केंद्रीय खरीद समिति के समक्ष सभी प्रकार के मामले रखना हैं। भंडार खरीद संगठन निदेशक (भंडार एवं खरीद) के नियंत्रण में कार्य करता है और सीसीएस एचएयू, हिसार के नियंत्रक नियंत्रण अधिकारी हैं। निदेशक (भंडार एवं खरीद) केंद्रीय खरीद समिति के सदस्य सचिव हैं।</p>

<h3 class="office-doc-heading">प्रक्रियाएँ एवं निर्देश</h3>
<ul>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/hwjr3ptIjzOkXy58AJB7HAPeXzHurKZEA6r6j2Ue.pdf" target="_blank" rel="noopener noreferrer">भंडार खरीद प्रक्रिया 2011 — संशोधन संख्या 37</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/YbDeaWvMQgEyK3FG7AAouE5OWaBFNh6Plfug8o2r.pdf" target="_blank" rel="noopener noreferrer">भंडार खरीद प्रक्रिया — 2018</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/UCToe5tP67zdF8IYxvd3noXGPoAQi2IXWWEcpFNM.pdf" target="_blank" rel="noopener noreferrer">केंद्रीय भंडार में उपलब्ध भंडार वस्तुओं की स्थिति</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/QfsIR7IPR3aU0sk31D704KTRMRs8v6qKpDAFCFVa.pdf" target="_blank" rel="noopener noreferrer">निर्देश</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/AB9UCSb8SQNXedDEH4Vmmp5SoWnPrVCVzeRI8uU8.pdf" target="_blank" rel="noopener noreferrer">निर्देश 2022</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/usUouX4HrKO728HqDh1kSPFNbxv7euYIJFpcdQ05.pdf" target="_blank" rel="noopener noreferrer">एसपीओ निर्देश 2023</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/VzEB3iacj7JMzpW2lEoCVTt9Mp5pCEfxfUPKNmIm.pdf" target="_blank" rel="noopener noreferrer">एसपीओ निर्देश 2024</a></li>
  <li><a href="https://hau.ac.in/storage/app/uploads/Qx1xRdywCbYOgDEr1w5ECNlZLlLApgVbT2wuYcls.pdf" target="_blank" rel="noopener noreferrer">एसपीओ निर्देश 2025</a></li>
</ul>

<h3 class="office-doc-heading">दर अनुबंध</h3>
<ul>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/LkxBod3rarVoJE2dSwMGyERwjayM0xipGGI4UFNV.pdf" target="_blank" rel="noopener noreferrer">दर अनुबंध (2019-20) — I</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/sFXddLYMQaCCtAVwaFK2BZgW6JrN2sbGrstZfjjm.pdf" target="_blank" rel="noopener noreferrer">दर अनुबंध (2019-20) — II</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/ry6NzTaDO10Tnkt1KYjKAtuWjWL2cQpsJBF9Rgjx.pdf" target="_blank" rel="noopener noreferrer">दर अनुबंध (2020-21)</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/YbeFqhozoz5TuSOop6KQNb3jMKYGx420CEDT2Oob.pdf" target="_blank" rel="noopener noreferrer">31.12.2020 तक की अवधि के लिए दर अनुबंध</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/0HwwIFoGqzXL02Z0dRLinHXEsnjNEVlseg7nh7bS.pdf" target="_blank" rel="noopener noreferrer">31.12.2021 तक की अवधि के लिए दर अनुबंध</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/74vWrg5ASXINCoWa6RSUnQcmfJrbXvpTcmtv38Nx.pdf" target="_blank" rel="noopener noreferrer">31.12.2022 तक की अवधि के लिए दर अनुबंध</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/bKdZMZBfoCfPkU5tSFNuKUAZq07exNmDxbswJeIU.pdf" target="_blank" rel="noopener noreferrer">31.12.2023 तक की अवधि के लिए दर अनुबंध — I</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/16IXXOcmxrBmZLJHHarZuOfYv4E4AdcQwDk58wHI.pdf" target="_blank" rel="noopener noreferrer">31.12.2023 तक की अवधि के लिए दर अनुबंध — II</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/bq7eplKRzZanvtmoar4uxQnBpplWPI5CDTRtVewp.pdf" target="_blank" rel="noopener noreferrer">31.03.2024 तक की अवधि के लिए दर अनुबंध</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/uEZoKmhhcV6lz8frrDrHgZDuWfxSpjYQ56HiAwxH.pdf" target="_blank" rel="noopener noreferrer">31.03.2025 तक की अवधि के लिए दर अनुबंध</a></li>
  <li><a href="https://hau.ac.in/storage/app/uploads/aBCPm0KetadQ0sNkWdA3eh81WDCLtPo5JsAyH0GK.pdf" target="_blank" rel="noopener noreferrer">31.03.2026 तक की अवधि के लिए दर अनुबंध</a></li>
</ul>

<h3 class="office-doc-heading">महत्वपूर्ण परिपत्र</h3>
<ul>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/bb0rSIWeSvuSNGh1m948VG5QceMGOiLSBOKGSwAe.pdf" target="_blank" rel="noopener noreferrer">महत्वपूर्ण परिपत्र 2019-20</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/L21ug6ewOyZddSPIIaa2VX7Cuovaqi6sUO85sDJW.pdf" target="_blank" rel="noopener noreferrer">महत्वपूर्ण परिपत्र 2020-21</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/QQ1u19lCRJi96B59JXghmoQxBhshR4ZUPHI5nWIL.pdf" target="_blank" rel="noopener noreferrer">महत्वपूर्ण परिपत्र 2021-22</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/mSWPU3CDKxxbXdpSSpRCiU2XUwFQSV5SjHmcNdEy.pdf" target="_blank" rel="noopener noreferrer">महत्वपूर्ण परिपत्र 2022-23</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/k0XHUb0GyNaOMzQGCxYevJWFlbAZhCq5jCUzdOZp.pdf" target="_blank" rel="noopener noreferrer">महत्वपूर्ण परिपत्र 2023-24</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/L4VMOhmi0nT5QF5J2I8gnLFReSF07haGM0mHb9uf.pdf" target="_blank" rel="noopener noreferrer">महत्वपूर्ण परिपत्र 2024-25</a></li>
  <li><a href="https://hau.ac.in/storage/app/uploads/1U2EaeGP5ybCs7TRCqDNanc2rrpH7XNzTtVyIyOV.pdf" target="_blank" rel="noopener noreferrer">महत्वपूर्ण परिपत्र 2025-26</a></li>
</ul>

<h3 class="office-doc-heading">जीईएम एवं अन्य दस्तावेज</h3>
<ul>
  <li><a href="https://gem.gov.in/trainingMaterial" target="_blank" rel="noopener noreferrer">जीईएम प्रशिक्षण वीडियो</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/IeKpYUfbudaU0D3T44PJOkaflk0tHucj9IGXqrEx.pdf" target="_blank" rel="noopener noreferrer">उपकरण विनिर्देश समिति</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/W6mXAFQ4SDOmgOk0W2malYdhjxKDiFLaYicYZDtX.pdf" target="_blank" rel="noopener noreferrer">उपकरण विनिर्देश समिति 2024-25 — सदस्यों की नामांकन</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/Np6JlD3Ogo6gyz298ESoQU07P9HNMrfV6wpo8E8e.pdf" target="_blank" rel="noopener noreferrer">उपकरण विनिर्देश समिति 2025-26 — सदस्यों की नामांकन</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/AZngPjerYZi9aYjlVShNsi7eFJ0clicttQiIrIRi.pdf" target="_blank" rel="noopener noreferrer">जीईएम पंजीकरण प्रपत्र</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/573SXNaxwPr2uhfvb82ZOXgo4ICeOPCbyBpf5jHE.pdf" target="_blank" rel="noopener noreferrer">डीएसआईआर प्रमाणपत्र</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/bgvrPVLBlDiQZ18CMTTywqHdUiwHuEh2XQ6TGatI.pdf" target="_blank" rel="noopener noreferrer">07.02.2018 — जीईएम पर खरीदार पंजीकरण के लिए सामान्य नियम और शर्तें</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/LQNRInjqXOXZfS0oAkL6oIDk7HTCPSAGGBO3zrpq.pdf" target="_blank" rel="noopener noreferrer">जीईएम उत्पाद सूची</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/jsZ56nh3YOgsmbZu1NOGOfb9FfcuuuDW653vNkpC.pdf" target="_blank" rel="noopener noreferrer">विदेशी लेटर ऑफ क्रेडिट</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/mO6P9LObrFdtZ99fwjCjUYGSmknlLS4iDz3z0cze.pdf" target="_blank" rel="noopener noreferrer">उपकरण विनिर्देश समिति — वित्तीय वर्ष 2023-24 के लिए कुलपति द्वारा नामित</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/xLuNlw0uT5o6CCHGWxMUsad1tydhNv9eXJBTIIcl.pdf" target="_blank" rel="noopener noreferrer">विदेश से वस्तुओं की खरीद हेतु विदेशी लेटर ऑफ क्रेडिट (एफएलसी) खोलना — 30.06.2025 तक की अवधि</a></li>
  <li><a href="https://ccshau.blob.core.windows.net/ccshaucontainer/legacy-storage/YxCQuKjgDFTKtOFHtD0l3Si8dfjOXKduIRueIa2l.pdf" target="_blank" rel="noopener noreferrer">आपूर्ति आदेश में प्रदर्शन सुरक्षा खंड का समावेश</a></li>
  <li><a href="https://hau.ac.in/storage/app/uploads/0w0APVlfJPU6QNPOxUOSwlknpmIThPAL3l7ldr8l.pdf" target="_blank" rel="noopener noreferrer">स्टेशनरी, अनुसंधान स्टेशनरी और विविध वस्तुओं की मांग 2026-27</a></li>
  <li><a href="https://hau.ac.in/storage/app/uploads/GCX2icD6kOGdBh0VjlknM4bt6gmjYaAs680OGpMP.pdf" target="_blank" rel="noopener noreferrer">रेक्टिफाइड स्पिरिट के भंडारण हेतु एनओसी के लिए अग्नि सलाहकार की नियुक्ति</a></li>
  <li><a href="https://hau.ac.in/storage/app/uploads/phTHiw2E2XHMetYfOa7JxDoMvFSxJS55GY5WowZJ.pdf" target="_blank" rel="noopener noreferrer">स्टेशनरी वस्तुओं और विविध वस्तुओं की खरीद</a></li>
  <li><a href="https://hau.ac.in/storage/app/uploads/zEF9gDBDOKJyeLZz8msAGkCRJu4L2YFC8SHDmCJx.pdf" target="_blank" rel="noopener noreferrer">दर अनुबंध — 31.03.2027 तक की अवधि के लिए विभिन्न प्रकार की गैसों की खरीद</a></li>
  <li><a href="https://hau.ac.in/storage/app/uploads/1FxjxDOIePUVlodkczhXA5PHj7DFcZY74cTvOxkp.pdf" target="_blank" rel="noopener noreferrer">दर अनुबंध — एक्साइड ब्रांड यूपीएस/औद्योगिक/घरेलू श्रेणी की बैटरियाँ बाय-बैक सहित</a></li>
  <li><a href="https://hau.ac.in/storage/app/uploads/9AaDIUJ5wFnT7TgtLKb4OKXr6DTuFuIyh2XybVFU.pdf" target="_blank" rel="noopener noreferrer">दर अनुबंध — क्वांटा (अमरॉन) अमरा राजा बैटरियाँ बाय-बैक सहित</a></li>
  <li><a href="https://hau.ac.in/storage/app/uploads/TbjkrvSCT4oPADuC8mhVenhRGzpXzmAT5CUVG0VA.pdf" target="_blank" rel="noopener noreferrer">दर अनुबंध — ल्यूमिनस ब्रांड औद्योगिक/घरेलू श्रेणी की बैटरियाँ</a></li>
  <li><a href="https://hau.ac.in/storage/app/uploads/mZr1EUiP6T7TsV4OwicQfAywp8CP8ZZAGMYF2pZA.pdf" target="_blank" rel="noopener noreferrer">दर अनुबंध — प्लानिंग स्कैनिंग रंगीन फोटोग्राफ</a></li>
</ul>`;

const ORGANOGRAM_HI = `<div class="single-event-text">
    <iframe
        src="https://fvveqziyusjgqejowkfp.supabase.co/storage/v1/object/sign/ccshau-private/1711089021.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9mNzQ0M2JlZi1lODE3LTQ4OTUtOTg3NC1kNmJhY2VjZmZjNTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjY3NoYXUtcHJpdmF0ZS8xNzExMDg5MDIxLnBkZiIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3ODI4MDE5MTYsImV4cCI6MTgxNDMzNzkxNn0.gjG6Kp95_YRkNdWieHD4DhwcS7mCehTm6f_iXzGD30w"
        width="780"
        height="650"
        style="border: none;"
        title="पीडीएफ दर्शक">
    </iframe>

    <p class="text-center" style="margin-top: 20px;">
        <b>अंतिम अद्यतन :-</b> Fri Mar 22 2024
    </p>
</div>`;

const SIDEBAR_CONTENT_HI = {
  "aed272d0-1c60-4fcb-9780-eb1bcc38e470": HOME_HI,
  "f5e0d269-a9e6-4dbd-a00b-b66ca55d9605": SPO_HI,
  "5687d63f-008c-43c2-a257-b1a92489e86b": ORGANOGRAM_HI,
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
    .in("id", Object.keys(SIDEBAR_CONTENT_HI));

  if (error) throw error;

  console.log(`Page: comptroller-office (${PAGE_ID})`);
  console.log(`Tabs to update: ${sidebars.length}`);

  for (const item of sidebars) {
    console.log(`  - ${item.label_en}`);
  }

  if (!APPLY) {
    console.log("\nDry-run only. Pass --apply to write to database.");
    return;
  }

  const homeHi = HOME_HI.replace(/\r?\n/g, "\r\n");
  const { error: pageErr } = await supabase
    .from("ccshau_pages")
    .update({ content_hi: homeHi })
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

  console.log(`\nApplied ${updated} sidebar content_hi updates + synced page content_hi.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
