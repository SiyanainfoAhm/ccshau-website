#!/usr/bin/env node
/**
 * Align hrm-directorate with legacy https://hau.ac.in/department/MjA=/NzA=
 * - HOD = Dr. Naresh Kaushik (Director HRM) + legacy photo
 * - Faculty = 4 people only (Ramesh removed from page)
 * - Clear wrong page body docs; keep only HOD + Faculty sidebar tabs
 *
 *   node scripts/ops/fix-hrm-directorate-legacy-faculty.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const CACHE = join(__dirname, "../legacy-import/reports/hrm-hod-photo-cache");
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";

const DIR_ID = "06fdb7e4-d403-4200-ae4c-02d4bc7c00fd";
const RAMESH_STAFF = "0e86e908-67c3-4e98-bde8-68234543e999";
const LEGACY_PHOTO =
  "https://hau.ac.in/storage/app/uploads/college-user/jIwD9FdCtbzshcUSBqUyuW2UjrjczMgrv5fa0kx4.jpeg";

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

function azurePublicStored(blobPath) {
  return `${CONTAINER}/${blobPath}`;
}

async function uploadHodPhoto(container) {
  const blobPath = "legacy-storage/college-user/jIwD9FdCtbzshcUSBqUyuW2UjrjczMgrv5fa0kx4.jpeg";
  const stored = azurePublicStored(blobPath);
  const blob = container.getBlockBlobClient(blobPath);
  if (await blob.exists()) return stored;

  mkdirSync(CACHE, { recursive: true });
  const cacheFile = join(CACHE, "naresh-kaushik-director-hrm.jpeg");
  let buf;
  if (existsSync(cacheFile)) {
    buf = readFileSync(cacheFile);
  } else {
    const r = await fetch(LEGACY_PHOTO, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Referer: "https://hau.ac.in/department/MjA=/NzA=",
      },
    });
    if (!r.ok) throw new Error(`photo fetch ${r.status}`);
    buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 500) throw new Error(`photo too small ${buf.length}`);
    await writeFile(cacheFile, buf);
  }
  await blob.uploadData(buf, {
    blobHTTPHeaders: { blobContentType: "image/jpeg" },
    overwrite: true,
  });
  return stored;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (!url || !key) throw new Error("Missing Supabase env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
  console.log("Will set HOD → Dr. Naresh Kaushik (Director HRM)");
  console.log("Will deactivate Dr. Ramesh Kumar on directorate");
  console.log("Will clear page body + keep only HOD/Faculty sidebar tabs");

  if (!APPLY) {
    console.log("Pass --apply to write.");
    return;
  }
  if (!conn) throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING");

  const container = BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
  const imagePath = await uploadHodPhoto(container);
  console.log("photo:", imagePath);

  // 1) clear wrong body content (legacy HOD has no about docs)
  {
    const { error } = await sb
      .from("ccshau_pages")
      .update({ content_en: null, content_hi: null, updated_at: now })
      .eq("id", DIR_ID);
    if (error) throw error;
    console.log("OK cleared directorate content");
  }

  // 2) sidebar: only Head of Department + Faculty
  {
    const { data: sides } = await sb
      .from("ccshau_page_sidebar_items")
      .select("id, label_en")
      .eq("page_id", DIR_ID);
    for (const s of sides ?? []) {
      const keep = /^(head of department|faculty)$/i.test(s.label_en.trim());
      const { error } = await sb
        .from("ccshau_page_sidebar_items")
        .update({ is_active: keep, updated_at: now })
        .eq("id", s.id);
      if (error) throw error;
      console.log(`  sidebar ${s.label_en}: ${keep ? "KEEP" : "off"}`);
    }
  }

  // 3) deactivate Ramesh on directorate
  {
    await sb
      .from("ccshau_page_staff")
      .update({ is_active: false, updated_at: now })
      .eq("id", RAMESH_STAFF);
    await sb
      .from("ccshau_faculty_assignments")
      .update({ is_active: false, updated_at: now })
      .eq("page_id", DIR_ID)
      .eq("source_staff_id", RAMESH_STAFF);
    console.log("OK deactivated Ramesh on directorate");
  }

  // 4) ensure Naresh person + staff + hod assignment
  let personId;
  {
    const { data: byEmail } = await sb
      .from("ccshau_faculty_people")
      .select("id, name_en, email, image_path")
      .eq("email", "dhrmccshau@gmail.com")
      .maybeSingle();
    if (byEmail) {
      personId = byEmail.id;
      await sb
        .from("ccshau_faculty_people")
        .update({
          name_en: "Dr. Naresh Kaushik",
          name_hi: "डॉ. नरेश कौशिक",
          email: "dhrmccshau@gmail.com",
          mobile: "01662255414",
          image_path: imagePath,
          is_active: true,
          updated_at: now,
        })
        .eq("id", personId);
    } else {
      const { data: created, error } = await sb
        .from("ccshau_faculty_people")
        .insert({
          name_en: "Dr. Naresh Kaushik",
          name_hi: "डॉ. नरेश कौशिक",
          email: "dhrmccshau@gmail.com",
          mobile: "01662255414",
          image_path: imagePath,
          is_active: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      personId = created.id;
    }
    console.log("OK person", personId);
  }

  let staffId;
  {
    const { data: existing } = await sb
      .from("ccshau_page_staff")
      .select("id")
      .eq("page_id", DIR_ID)
      .ilike("name_en", "%Naresh Kaushik%")
      .maybeSingle();

    const payload = {
      page_id: DIR_ID,
      name_en: "Dr. Naresh Kaushik",
      name_hi: "डॉ. नरेश कौशिक",
      designation_en: "Director HRM",
      designation_hi: "निदेशक मानव संसाधन प्रबंधन",
      email: "dhrmccshau@gmail.com",
      mobile: "01662255414",
      image_path: imagePath,
      sort_order: 1,
      is_active: true,
      detail_content_en: null,
      detail_content_hi: null,
      updated_at: now,
    };

    if (existing) {
      staffId = existing.id;
      const { error } = await sb.from("ccshau_page_staff").update(payload).eq("id", staffId);
      if (error) throw error;
    } else {
      const { data: created, error } = await sb
        .from("ccshau_page_staff")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      staffId = created.id;
    }
    console.log("OK staff", staffId);
  }

  {
    // demote any other hod on page
    await sb
      .from("ccshau_faculty_assignments")
      .update({ member_type: "faculty", is_active: false, updated_at: now })
      .eq("page_id", DIR_ID)
      .eq("member_type", "hod")
      .neq("person_id", personId);

    const { data: existing } = await sb
      .from("ccshau_faculty_assignments")
      .select("id")
      .eq("page_id", DIR_ID)
      .eq("person_id", personId)
      .maybeSingle();

    const asg = {
      person_id: personId,
      page_id: DIR_ID,
      source_staff_id: staffId,
      designation_en: "Director HRM",
      designation_hi: "निदेशक मानव संसाधन प्रबंधन",
      member_type: "hod",
      staff_slug: "naresh-kaushik-director-hrm",
      sort_order: 1,
      is_active: true,
      updated_at: now,
    };

    if (existing) {
      const { error } = await sb.from("ccshau_faculty_assignments").update(asg).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from("ccshau_faculty_assignments").insert(asg);
      if (error) throw error;
    }
    console.log("OK Naresh is directorate HOD");
  }

  // 5) copy specialization_en from staff → assignments for faculty rows
  {
    const { data: staffRows } = await sb
      .from("ccshau_page_staff")
      .select("id, specialization_en, specialization_hi")
      .eq("page_id", DIR_ID)
      .eq("is_active", true);
    for (const s of staffRows ?? []) {
      if (!s.specialization_en) continue;
      await sb
        .from("ccshau_faculty_assignments")
        .update({
          specialization_en: s.specialization_en,
          specialization_hi: s.specialization_hi,
          updated_at: now,
        })
        .eq("source_staff_id", s.id)
        .eq("page_id", DIR_ID);
    }
    console.log("OK synced faculty specializations");
  }

  // verify
  const { data: asg } = await sb
    .from("ccshau_faculty_assignments")
    .select("member_type, designation_en, is_active, person:person_id(name_en)")
    .eq("page_id", DIR_ID)
    .eq("is_active", true)
    .order("sort_order");
  console.log("\nActive assignments:");
  for (const a of asg ?? []) console.log(" ", a.member_type, a.person?.name_en, a.designation_en);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
