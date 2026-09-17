#!/usr/bin/env node
/**
 * Align HRM Directorate + AAREM pages with legacy HAU departments:
 *   https://hau.ac.in/department/MjA=/NzA=  → hrm-directorate
 *   https://hau.ac.in/department/MjA=/NzI=  → hrm-academy-...
 *
 * Fixes:
 * - Directorate: move deptpdf doc links from HOD profile → page content; add contacts; clear HOD detail dump
 * - AAREM: featured HOD = Dr. Yogesh Jindal (Assoc. Director); demote wrong AAREM "Director" HOD
 * - AAREM: curated content_hi + sidebar label_hi
 *
 *   node scripts/ops/fix-hrm-directorate-aarem-legacy.mjs
 *   node scripts/ops/fix-hrm-directorate-aarem-legacy.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const CACHE = join(__dirname, "../legacy-import/reports/hrm-deptpdf-cache");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

const DIR_ID = "06fdb7e4-d403-4200-ae4c-02d4bc7c00fd";
const AAREM_ID = "f8200e88-2ed4-4e60-9f22-219566617f72";
const DIR_HOD_STAFF = "0e86e908-67c3-4e98-bde8-68234543e999"; // Ramesh Director HRM
const AAREM_WRONG_HOD_STAFF = "f119f20b-ffc8-4175-b3a2-27a75192727e"; // Ramesh "Director" on AAREM
const YOGESH_PERSON = "25312b20-62fc-43c8-9636-de8dd209de79";
const YOGESH_DIR_STAFF = "f5aff83a-d7ff-4308-8c60-3a630764215a";

const LEGACY_DOCS = [
  {
    url: "https://hau.ac.in/deptpdf/1497323963faculty_r_proforma.doc",
    labelEn: "Faculty Review Proforma",
    labelHi: "संकाय समीक्षा प्रपत्र",
  },
  {
    url: "https://hau.ac.in/deptpdf/14973240443609.pdf",
    labelEn:
      "Comprehensive guidelines/procedure for grant of permission/participation of teachers/scientists in Conferences/Symposium/ Workshop/Seminar etc.",
    labelHi:
      "सम्मेलन / संगोष्ठी / कार्यशाला / सेमिनार आदि में शिक्षकों / वैज्ञानिकों की अनुमति / भागीदारी हेतु व्यापक दिशानिर्देश / प्रक्रिया",
  },
  {
    url: "https://hau.ac.in/deptpdf/1497324077trainwithin.pdf",
    labelEn: "Proforma for training etc. within country.",
    labelHi: "देश के भीतर प्रशिक्षण आदि हेतु प्रपत्र",
  },
  {
    url: "https://hau.ac.in/deptpdf/1497324101trainoutside.pdf",
    labelEn: "Proforma for training etc. outside the country.",
    labelHi: "देश के बाहर प्रशिक्षण आदि हेतु प्रपत्र",
  },
];

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const { BlobServiceClient } = requireFromWeb("@azure/storage-blob");

function azurePublicUrl(stored) {
  const account = process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

function contentTypeFor(name) {
  const e = extname(name).toLowerCase();
  return (
    {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }[e] || "application/octet-stream"
  );
}

async function ensureAzure(container, hauUrl) {
  const fileName = basename(new URL(hauUrl).pathname);
  const blobPath = `legacy-storage/deptpdf/${fileName}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = container.getBlockBlobClient(blobPath);
  if (await blob.exists()) return { publicUrl, reused: true };

  mkdirSync(CACHE, { recursive: true });
  const cacheFile = join(
    CACHE,
    `${createHash("sha1").update(hauUrl).digest("hex").slice(0, 12)}-${fileName}`,
  );
  let buf;
  if (existsSync(cacheFile)) {
    buf = readFileSync(cacheFile);
  } else {
    const r = await fetch(hauUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "*/*",
        Referer: "https://hau.ac.in/",
      },
    });
    if (!r.ok) {
      // Legacy deptpdf often 404 — keep original URL in content
      return { publicUrl: hauUrl, reused: false, skipped: true, status: r.status };
    }
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 200) {
      return { publicUrl: hauUrl, reused: false, skipped: true, status: `too-small-${buf.length}` };
    }
    await writeFile(cacheFile, buf);
  }
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
    overwrite: true,
  });
  return { publicUrl, reused: false, bytes: buf.length };
}

const AAREM_CONTENT_HI = `<p style="text-align: justify;"><span style='font-size: 18px; font-family: "Times New Roman", Times, serif;'>सी.सी.एस.एच.ए.यू., हिसार ने अपने रजत जयंती वर्ष 1994-95 में विश्व बैंक के वित्तीय सहयोग से कृषि मानव संसाधन विकास परियोजना के अंतर्गत कृषि अनुसंधान एवं शिक्षा प्रबंधन अकादमी (ए.ए.आर.ई.एम.) की स्थापना की। ए.ए.आर.ई.एम. के गठन से शिक्षक-प्रशिक्षण के क्षेत्र में विद्यमान रिक्तता की पूर्ति हुई।</span></p><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;"><strong>उद्देश्य:</strong></span></span></p><ul><li style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">विश्वविद्यालय में नव नियुक्त शिक्षकों के लिए प्रवेश प्रशिक्षण कार्यक्रम आयोजित एवं संचालित करना तथा सेवारत शिक्षकों के लिए पुनश्चर्या पाठ्यक्रम आयोजित करना।</span></span></li><li style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">विश्वविद्यालय शिक्षकों के लिए अनुसंधान प्रबंधन, शैक्षिक प्रौद्योगिकी, पाठ्यचर्या विकास, विस्तार प्रबंधन एवं मानव संसाधन प्रबंधन आदि क्षेत्रों में प्रशिक्षण कार्यक्रम आयोजित एवं संचालित करना।</span></span></li><li style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">कृषि एवं संबद्ध विषयों के उभरते विशिष्ट क्षेत्रों में प्रशिक्षण कार्यक्रम आयोजित करना।</span></span></li><li style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">कृषि अनुसंधान, शिक्षा एवं विस्तार प्रणाली में सामयिक रुचि के विषयों पर समूह चर्चा, सेमिनार एवं कार्यशालाएँ आयोजित करना।</span></span></li><li style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">शिक्षकों की उत्पादकता, उनकी प्रशिक्षण आवश्यकताओं तथा शिक्षक-प्रशिक्षण से संबंधित अन्य क्षेत्रों पर नमूना सर्वेक्षण एवं अनुसंधान करना।</span></span></li><li style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">शिक्षकों के लिए सतत शिक्षा कार्यक्रमों का डिजाइन, विकास एवं क्रियान्वयन करना।</span></span></li><li style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">कृषि विश्वविद्यालयों के प्रशासनिक कर्मचारियों तथा कृषि विकास से जुड़े अन्य कर्मियों के लिए आवश्यकता आधारित प्रशिक्षण कार्यक्रम विकसित एवं आयोजित करना।</span></span></li></ul><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">ए.ए.आर.ई.एम. संस्थागत सेवाकालीन प्रशिक्षणों के लिए सभी आधारभूत एवं आधुनिक अवसंरचनात्मक सुविधाओं तथा शिक्षण सहायक सामग्रियों से सुसज्जित है और विश्वविद्यालय शिक्षकों, वैज्ञानिकों, विस्तार विशेषज्ञों, अनुसंधान प्रबंधकों, प्रशासकों, नीति निर्माताओं, कृषि अधिकारियों तथा कृषि एवं संबद्ध विज्ञानों में कार्यरत अन्य वरिष्ठ अधिकारियों के लिए अनुकूलित पाठ्यक्रम प्रदान करता है।</span></span></p><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">प्रशिक्षण कार्यक्रम एवं पुनश्चर्या पाठ्यक्रम</span></span></p><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;"><strong>मुख्य पाठ्यक्रम</strong></span></span></p><ul><li style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">प्रवेश प्रशिक्षण</span></span></li><li style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">शैक्षिक प्रौद्योगिकी</span></span></li><li style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">अनुसंधान प्रबंधन</span></span></li><li style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">विस्तार प्रबंधन</span></span></li><li style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">संचार कौशल एवं तकनीकी लेखन</span></span></li><li style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">कृषि में कंप्यूटर शिक्षा</span></span></li></ul><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">अन्य प्रकोष्ठों / विभागों / बाहरी एजेंसियों के सहयोग से कृषि एवं संबद्ध विज्ञानों (पुस्तकालय एवं सूचना विज्ञान सहित) के उभरते क्षेत्रों में <strong>क्षेत्र-विशिष्ट सहयोगी प्रशिक्षण कार्यक्रम</strong> आयोजित किए जाते हैं। अकादमी हरियाणा सरकार एवं राज्य कृषि विश्वविद्यालयों के विभिन्न <strong>प्रायोजित पाठ्यक्रमों</strong> के माध्यम से भी प्रशिक्षण देती है। यह आई.सी.ए.आर. प्रायोजित शीतकालीन एवं ग्रीष्मकालीन विद्यालय भी आयोजित करती है। विदेश की संस्थाओं के अनुरोध पर <strong>अंतरराष्ट्रीय स्तर</strong> पर भी <strong>विशेषीकृत पाठ्यक्रम</strong> नियोजित एवं प्रस्तावित किए गए हैं। इन प्रशिक्षणों में कृषि एवं संबद्ध विज्ञानों के विशिष्ट क्षेत्र शामिल हैं। शिक्षा के प्रति भविष्योन्मुखी दृष्टिकोण के साथ अकादमी ने संकाय के लिए सतत शिक्षा कार्यक्रम भी विकसित किए हैं, जैसे <strong>कृषि पत्रकारिता</strong> एवं <strong>मानव संसाधन विकास</strong> में पीजी डिप्लोमा।</span></span></p><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;"><br><strong>सेमिनार / कार्यशालाएँ</strong></span></span></p><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">अपने प्रशिक्षण कार्यक्रमों का स्तर बनाए रखने एवं उसमें और सुधार हेतु ए.ए.आर.ई.एम. कृषि शिक्षा, अनुसंधान एवं विस्तार के विभिन्न पहलुओं पर समूह चर्चा, सेमिनार, कार्यशालाएँ, शैक्षिक भ्रमण, विचार-मंथन सत्र, शीतकालीन / ग्रीष्मकालीन विद्यालय आयोजित करता है। यह शिक्षकों की उत्पादकता संबंधी क्षेत्रों में नमूना सर्वेक्षण एवं अनुसंधान भी करता है।</span></span></p><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;"><br><strong>गैर-शैक्षणिक / पैरा-प्रशासनिक कर्मचारियों हेतु पाठ्यक्रम</strong></span></span></p><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">विश्वविद्यालय के मानव संसाधन की क्षमता विकास के उत्तरदायित्व के अंतर्गत ए.ए.आर.ई.एम. गैर-शैक्षणिक / पैरा-प्रशासनिक कर्मचारियों को भी भाषा, कंप्यूटर एवं अन्य आवश्यकता-आधारित क्षेत्रों में प्रशिक्षण प्रदान करता है।</span></span></p><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;"><br><strong>समझौता ज्ञापन (एम.ओ.यू.)</strong></span></span></p><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;">प्रशिक्षण कार्यक्रमों के अतिरिक्त अकादमी कृषि शिक्षा, अनुसंधान एवं विस्तार के क्षेत्र में सहयोग हेतु राष्ट्रीय एवं अंतरराष्ट्रीय स्तर पर निजी तथा सार्वजनिक एजेंसियों के साथ एम.ओ.यू. आरंभ एवं अंतिम रूप भी देती है। अकादमी का अंतरराष्ट्रीय डेस्क विदेशी शिक्षाविदों एवं छात्रों के दौरे हेतु डी.ए.आर.ई., एम.एच.ए. आदि से संपर्क बनाए रखता है। अकादमी संकाय को अंतरराष्ट्रीय / राष्ट्रीय सम्मेलनों / कार्यशालाओं / सेमिनारों / बैठकों आदि में भाग लेने की अनुमति की सुविधा भी प्रदान करती है। आई.सी.ए.आर., आई.ए.यू.ए., ए.आई.यू. हेतु कुलपति सम्मेलन एजेंडा एवं तत्पश्चात् की गई कार्रवाई रिपोर्ट तथा अन्य अनुवर्ती गतिविधियाँ भी अकादमी द्वारा देखी जाती हैं। इसके साथ ही आई.सी.ए.आर., आई.ए.यू.ए., ए.आई.यू., यू.जी.सी. आदि को सी.सी.एस.एच.ए.यू. संबंधी सूचना भी ए.ए.आर.ई.एम. द्वारा तैयार की जाती है।</span></span></p><p style="text-align: justify;"><span style="font-family: Times New Roman,Times,serif;"><span style="font-size: 18px;"><strong>मिशन:</strong></span></span></p><p style="text-align: justify;"><span style='font-size: 18px; font-family: "Times New Roman", Times, serif;'>संचार, प्रबंधन, मल्टीमीडिया अनुप्रयोग, बायोइंफॉर्मेटिक्स आदि क्षेत्रों में अब तक दिए जा रहे संस्थागत प्रशिक्षण को आगे बढ़ाना। राज्य कृषि विश्वविद्यालयों एवं आई.सी.ए.आर. संस्थानों के शिक्षण संकाय तथा वैज्ञानिकों की शिक्षण, अनुसंधान एवं विस्तार गतिविधियों से संबंधित नए क्षेत्रों की खोज कर अपने प्रशिक्षण कार्यक्रमों का विस्तार करना।</span></p>`;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);

  // --- upload docs ---
  const docUrls = [];
  if (APPLY) {
    if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");
    const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
    for (const d of LEGACY_DOCS) {
      const res = await ensureAzure(container, d.url);
      const tag = res.skipped ? `skip(${res.status})` : res.reused ? "reuse" : "up";
      console.log(`  doc ${tag} ${d.labelEn.slice(0, 40)} → ${res.publicUrl}`);
      docUrls.push({ ...d, href: res.publicUrl });
    }
  } else {
    for (const d of LEGACY_DOCS) docUrls.push({ ...d, href: d.url });
    console.log(`  would upload ${LEGACY_DOCS.length} deptpdf files to Azure`);
  }

  const content_en = `<ul>${docUrls
    .map((d) => `<li><a href="${d.href}" target="_blank" rel="noopener noreferrer">${d.labelEn}</a></li>`)
    .join("")}</ul>`;
  const content_hi = `<ul>${docUrls
    .map((d) => `<li><a href="${d.href}" target="_blank" rel="noopener noreferrer">${d.labelHi}</a></li>`)
    .join("")}</ul>`;

  console.log("\n1) Directorate page content ← dept documents (from HOD profile)");
  console.log("2) Clear Directorate HOD detail_content dump");
  console.log("3) Add Directorate contact lines (legacy mailing/phone/email)");
  console.log("4) AAREM HOD → Dr. Yogesh Jindal (Assoc. Director); demote AAREM Ramesh HOD");
  console.log("5) AAREM content_hi curated + sidebar labels");

  if (!APPLY) {
    console.log("\nPass --apply to write.");
    return;
  }

  const now = new Date().toISOString();

  // 1+2 directorate page + clear hod detail
  {
    const { error } = await supabase
      .from("ccshau_pages")
      .update({ content_en, content_hi, updated_at: now })
      .eq("id", DIR_ID);
    if (error) throw error;
    console.log("OK directorate content");

    const { data: asg } = await supabase
      .from("ccshau_faculty_assignments")
      .select("person_id")
      .eq("source_staff_id", DIR_HOD_STAFF)
      .maybeSingle();

    const { error: sErr } = await supabase
      .from("ccshau_page_staff")
      .update({ detail_content_en: null, detail_content_hi: null, updated_at: now })
      .eq("id", DIR_HOD_STAFF);
    if (sErr) throw sErr;

    if (asg?.person_id) {
      const { error: pErr } = await supabase
        .from("ccshau_faculty_people")
        .update({ detail_content_en: null, detail_content_hi: null, updated_at: now })
        .eq("id", asg.person_id);
      if (pErr) throw pErr;
    }
    console.log("OK cleared directorate HOD detail dump");
  }

  // 3 contact lines
  {
    await supabase.from("ccshau_page_contact_lines").delete().eq("page_id", DIR_ID);
    await supabase.from("ccshau_page_contact_lines").delete().eq("page_id", AAREM_ID);
    const lines = [
      {
        page_id: DIR_ID,
        label_en: "Mailing Address",
        label_hi: "डाक पता",
        value_en:
          "Directorate of Human Resource Management, CCS Haryana Agricultural University-125004 (Haryana)",
        value_hi:
          "मानव संसाधन प्रबंधन निदेशालय, चौ. चरण सिंह हरियाणा कृषि विश्वविद्यालय-125004 (हरियाणा)",
        sort_order: 1,
        is_active: true,
      },
      {
        page_id: DIR_ID,
        label_en: "Phone No",
        label_hi: "दूरभाष संख्या",
        value_en: "01662255414",
        value_hi: "01662255414",
        sort_order: 2,
        is_active: true,
      },
      {
        page_id: DIR_ID,
        label_en: "Email Id",
        label_hi: "ई-मेल आईडी",
        value_en: "dhrmccshau@gmail.com",
        value_hi: "dhrmccshau@gmail.com",
        sort_order: 3,
        is_active: true,
      },
      {
        page_id: AAREM_ID,
        label_en: "Mailing Address",
        label_hi: "डाक पता",
        value_en:
          "Directorate of Human Resource Management, CCS Haryana Agricultural University-125004 (Haryana)",
        value_hi:
          "मानव संसाधन प्रबंधन निदेशालय, चौ. चरण सिंह हरियाणा कृषि विश्वविद्यालय-125004 (हरियाणा)",
        sort_order: 1,
        is_active: true,
      },
      {
        page_id: AAREM_ID,
        label_en: "Phone No",
        label_hi: "दूरभाष संख्या",
        value_en: "01662255414",
        value_hi: "01662255414",
        sort_order: 2,
        is_active: true,
      },
      {
        page_id: AAREM_ID,
        label_en: "Email Id",
        label_hi: "ई-मेल आईडी",
        value_en: "aarem@hau.ac.in",
        value_hi: "aarem@hau.ac.in",
        sort_order: 3,
        is_active: true,
      },
    ];
    const { error } = await supabase.from("ccshau_page_contact_lines").insert(lines);
    if (error) throw error;
    console.log("OK contact lines on directorate + AAREM");
  }

  // 4 AAREM HOD = Yogesh
  {
    // demote wrong Ramesh HOD on AAREM
    await supabase
      .from("ccshau_faculty_assignments")
      .update({ member_type: "faculty", updated_at: now })
      .eq("page_id", AAREM_ID)
      .eq("source_staff_id", AAREM_WRONG_HOD_STAFF);

    await supabase
      .from("ccshau_page_staff")
      .update({ updated_at: now })
      .eq("id", AAREM_WRONG_HOD_STAFF);

    // ensure Yogesh staff row on AAREM
    let { data: yogeshStaff } = await supabase
      .from("ccshau_page_staff")
      .select("id")
      .eq("page_id", AAREM_ID)
      .ilike("name_en", "%Yogesh%Jindal%")
      .maybeSingle();

    if (!yogeshStaff) {
      // clone from directorate staff row basics
      const { data: src } = await supabase
        .from("ccshau_page_staff")
        .select("*")
        .eq("id", YOGESH_DIR_STAFF)
        .single();
      if (!src) throw new Error("Yogesh directorate staff missing");
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = src;
      const { data: created, error: cErr } = await supabase
        .from("ccshau_page_staff")
        .insert({
          ...rest,
          page_id: AAREM_ID,
          designation_en: "Assoc. Director of AAREM",
          designation_hi: "ए.ए.आर.ई.एम. के सहयोगी निदेशक",
          email: "aarem@hau.ac.in",
          mobile: "01662255414",
          sort_order: 1,
          is_active: true,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;
      yogeshStaff = created;
      console.log("OK created Yogesh staff on AAREM", yogeshStaff.id);
    } else {
      await supabase
        .from("ccshau_page_staff")
        .update({
          designation_en: "Assoc. Director of AAREM",
          designation_hi: "ए.ए.आर.ई.एम. के सहयोगी निदेशक",
          email: "aarem@hau.ac.in",
          mobile: "01662255414",
          sort_order: 1,
          is_active: true,
          updated_at: now,
        })
        .eq("id", yogeshStaff.id);
      console.log("OK updated Yogesh staff on AAREM");
    }

    // assignment
    const { data: existingAsg } = await supabase
      .from("ccshau_faculty_assignments")
      .select("id")
      .eq("page_id", AAREM_ID)
      .eq("person_id", YOGESH_PERSON)
      .maybeSingle();

    if (existingAsg) {
      const { error } = await supabase
        .from("ccshau_faculty_assignments")
        .update({
          member_type: "hod",
          designation_en: "Assoc. Director of AAREM",
          designation_hi: "ए.ए.आर.ई.एम. के सहयोगी निदेशक",
          source_staff_id: yogeshStaff.id,
          sort_order: 1,
          is_active: true,
          updated_at: now,
        })
        .eq("id", existingAsg.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("ccshau_faculty_assignments").insert({
        person_id: YOGESH_PERSON,
        page_id: AAREM_ID,
        source_staff_id: yogeshStaff.id,
        designation_en: "Assoc. Director of AAREM",
        designation_hi: "ए.ए.आर.ई.एम. के सहयोगी निदेशक",
        member_type: "hod",
        staff_slug: "legacy-user-526",
        sort_order: 1,
        is_active: true,
      });
      if (error) throw error;
    }
    console.log("OK Yogesh is AAREM HOD");

    // demote Renu from competing as primary (keep faculty)
    await supabase
      .from("ccshau_faculty_assignments")
      .update({ member_type: "faculty", sort_order: 2, updated_at: now })
      .eq("page_id", AAREM_ID)
      .eq("designation_en", "Assoc. Director of AAREM")
      .neq("person_id", YOGESH_PERSON);
  }

  // 5 AAREM hindi + sidebar labels
  {
    const { error } = await supabase
      .from("ccshau_pages")
      .update({ content_hi: AAREM_CONTENT_HI, updated_at: now })
      .eq("id", AAREM_ID);
    if (error) throw error;

    const labelFixes = [
      {
        match: "Application Form for participation in the Training Programme",
        label_hi: "प्रशिक्षण कार्यक्रम में प्रतिभागिता हेतु आवेदन प्रपत्र",
      },
      {
        match: "List of Courses",
        label_hi: "पाठ्यक्रमों की सूची",
      },
      {
        match: "International MoU",
        label_hi: "अंतरराष्ट्रीय समझौता ज्ञापन",
      },
      {
        match: "National MoU",
        label_hi: "राष्ट्रीय समझौता ज्ञापन",
      },
    ];
    for (const f of labelFixes) {
      await supabase
        .from("ccshau_page_sidebar_items")
        .update({ label_hi: f.label_hi, updated_at: now })
        .eq("page_id", AAREM_ID)
        .eq("label_en", f.match);
    }
    console.log("OK AAREM content_hi + sidebar labels");
  }

  // Enable contacts display on both pages
  for (const id of [DIR_ID, AAREM_ID]) {
    const { data: page } = await supabase
      .from("ccshau_pages")
      .select("layout_config")
      .eq("id", id)
      .single();
    const layout = { ...(page?.layout_config ?? {}), contacts: true };
    const { error } = await supabase
      .from("ccshau_pages")
      .update({ layout_config: layout, updated_at: now })
      .eq("id", id);
    if (error) throw error;
  }
  console.log("OK layout_config.contacts = true");

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
