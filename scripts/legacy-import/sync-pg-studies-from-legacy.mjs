/**
 * Sync PG Studies hub with legacy https://hau.ac.in/college/pg-studies
 * - Dean: Dr. Atul Dhingra + photo → Azure
 * - About content aligned to legacy About section
 * Usage: node sync-pg-studies-from-legacy.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT = join(__dirname, "reports");
const CACHE = join(REPORT, "pg-studies-cache");
const CONFIRM = process.argv.includes("--confirm");
const PAGE_SLUG = "pg-studies";
const LIVE = "https://hau.ac.in/college/pg-studies";
const DEAN_IMG =
  "https://hau.ac.in/storage/app/uploads/college-user/kLRPBxdZNCcL3JMiuyU299BIZpW126g70IaeCtHB.jpeg";
const BANNER =
  "https://hau.ac.in/public/images/college/banner/25/1548308054.jpg";
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
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

function contentTypeFor(fileName) {
  const e = extname(fileName).toLowerCase();
  return (
    {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
    }[e] || "application/octet-stream"
  );
}

function azurePublicUrl(stored) {
  const account =
    process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() || "ccshau";
  return `https://${account}.blob.core.windows.net/${stored}`;
}

async function ensureAzure(containerClient, imageUrl, blobSubpath) {
  const fileName = basename(new URL(imageUrl).pathname);
  const blobPath = `${blobSubpath}/${fileName}`;
  const stored = `${CONTAINER}/${blobPath}`;
  const publicUrl = azurePublicUrl(stored);
  const blob = containerClient.getBlockBlobClient(blobPath);
  if (await blob.exists()) return { stored, publicUrl };

  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, fileName);
  let buf;
  if (existsSync(cachePath)) {
    buf = await readFile(cachePath);
  } else {
    const r = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://hau.ac.in/",
      },
    });
    if (!r.ok) throw new Error(`fetch ${imageUrl}: ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 200) throw new Error(`too small ${imageUrl}`);
    await writeFile(cachePath, buf);
  }
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: contentTypeFor(fileName) },
  });
  return { stored, publicUrl };
}

const CONTENT_EN = `
<p>Dean, Postgraduate Studies office basically shoulders the following responsibilities :</p>
<ol>
<li>To upgrade the course work in view of the ICAR recommendations and the stakeholders of the State and implementation thereof in letter and spirit.</li>
<li>To monitor the postgraduate research in the university.</li>
<li>To conduct the activities such as admissions, registrations, appointment of examiners, evaluation of thesis, preparation of transcripts, organizing convocation and providing degrees, selections for gold medals, best teacher awards, etc.</li>
</ol>
<p>The Dean, Post-graduate Studies has been entrusted the responsibility of postgraduate teaching at the university in consultation with the Deans of the constituent colleges, Director of Research and Director of Extension Education. Further, Dean is responsible for coordination of research of post-graduate students and its integration with the thrust areas of research. The course curriculum has been updated from time to time as per ICAR guidelines and also by keeping in view the specific requirements of Haryana State.</p>
`.trim();

const CONTENT_HI = `
<p>डीन, स्नातकोत्तर अध्ययन कार्यालय मूल रूप से निम्नलिखित जिम्मेदारियों का निर्वहन करता है:</p>
<ol>
<li>आईसीएआर की सिफारिशों और राज्य के हितधारकों के दृष्टिगत पाठ्यक्रम कार्य को उन्नत करना और उसे शाब्दिक एवं व्यावहारिक रूप से लागू करना।</li>
<li>विश्वविद्यालय में स्नातकोत्तर अनुसंधान की निगरानी करना।</li>
<li>प्रवेश, पंजीकरण, परीक्षकों की नियुक्ति, शोध प्रबंध मूल्यांकन, ट्रांसक्रिप्ट तैयारी, दीक्षांत समारोह आयोजन, डिग्री प्रदान करना, स्वर्ण पदक चयन, सर्वश्रेष्ठ शिक्षक पुरस्कार आदि गतिविधियों का संचालन करना।</li>
</ol>
<p>डीन, स्नातकोत्तर अध्ययन को घटक महाविद्यालयों के डीन, अनुसंधान निदेशक और विस्तार शिक्षा निदेशक के परामर्श से विश्वविद्यालय में स्नातकोत्तर शिक्षण की जिम्मेदारी सौंपी गई है। इसके अतिरिक्त, डीन स्नातकोत्तर छात्रों के अनुसंधान के समन्वय और अनुसंधान के प्रमुख क्षेत्रों के साथ उसके एकीकरण के लिए जिम्मेदार है। पाठ्यक्रम को समय-समय पर आईसीएआर दिशानिर्देशों के अनुसार तथा हरियाणा राज्य की विशिष्ट आवश्यकताओं को ध्यान में रखते हुए अद्यतन किया जाता रहा है।</p>
`.trim();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  if (CONFIRM && !conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  // Confirm live dean still Atul Dhingra
  const liveHtml = await (await fetch(LIVE, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
  if (!/Atul\s*Dhingra/i.test(liveHtml)) {
    console.warn("WARNING: live page may not show Dr. Atul Dhingra anymore");
  }

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: page, error } = await sb
    .from("ccshau_pages")
    .select("id,slug,head_name_en,head_image_path,featured_image_path,content_en")
    .eq("slug", PAGE_SLUG)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!page) throw new Error("pg-studies page missing");

  console.log("before", {
    head: page.head_name_en,
    image: page.head_image_path,
    contentLen: (page.content_en || "").length,
  });

  let deanStored = page.head_image_path;
  let bannerStored = page.featured_image_path;

  if (CONFIRM) {
    const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(
      CONTAINER,
    );
    const dean = await ensureAzure(
      container,
      DEAN_IMG,
      "pages/pg-studies/dean",
    );
    deanStored = dean.stored;
    console.log("dean photo", dean.publicUrl);

    try {
      const banner = await ensureAzure(
        container,
        BANNER,
        "pages/pg-studies/banner",
      );
      bannerStored = banner.stored;
      console.log("banner", banner.publicUrl);
    } catch (e) {
      console.warn("banner upload skipped:", e.message);
      // keep absolute URL if azure fails
      bannerStored = BANNER;
    }

    const { error: upErr } = await sb
      .from("ccshau_pages")
      .update({
        head_name_en: "Dr. Atul Dhingra",
        head_name_hi: "डॉ. अतुल ढींगरा",
        head_role_en: "Dean",
        head_role_hi: "डीन",
        head_image_path: deanStored,
        featured_image_path: bannerStored,
        content_en: CONTENT_EN,
        content_hi: CONTENT_HI,
        excerpt_en:
          "Dean, Postgraduate Studies — CCS Haryana Agricultural University, Hisar.",
        excerpt_hi:
          "डीन, स्नातकोत्तर अध्ययन — चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार।",
        updated_at: new Date().toISOString(),
      })
      .eq("id", page.id);
    if (upErr) throw new Error(upErr.message);

    // Refresh contacts to match legacy wording
    await sb.from("ccshau_page_contact_lines").delete().eq("page_id", page.id);
    const { error: cErr } = await sb.from("ccshau_page_contact_lines").insert([
      {
        page_id: page.id,
        label_en: "Mailing Address",
        label_hi: "डाक पता",
        value_en:
          "Postgraduate Studies, CCS Haryana Agricultural University, Hisar - 125 004, India.",
        value_hi:
          "स्नातकोत्तर अध्ययन, चौ० चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार - 125 004, भारत।",
        sort_order: 1,
        is_active: true,
      },
      {
        page_id: page.id,
        label_en: "Office",
        label_hi: "कार्यालय",
        value_en: "Office : 1662-255326",
        value_hi: "कार्यालय : 1662-255326",
        sort_order: 2,
        is_active: true,
      },
      {
        page_id: page.id,
        label_en: "Email Id",
        label_hi: "ई-मेल आईडी",
        value_en: "dpgs@hau.ac.in",
        value_hi: "dpgs@hau.ac.in",
        sort_order: 3,
        is_active: true,
      },
    ]);
    if (cErr) throw new Error(cErr.message);
  }

  mkdirSync(REPORT, { recursive: true });
  writeFileSync(
    join(REPORT, "sync-pg-studies-from-legacy.json"),
    JSON.stringify(
      {
        mode: CONFIRM ? "apply" : "dry-run",
        pageId: page.id,
        dean: "Dr. Atul Dhingra",
        deanImage: deanStored,
        banner: bannerStored,
        liveDean: /Atul\s*Dhingra/i.test(liveHtml),
      },
      null,
      2,
    ),
  );
  console.log(CONFIRM ? "done" : "dry-run only; pass --confirm to write");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
