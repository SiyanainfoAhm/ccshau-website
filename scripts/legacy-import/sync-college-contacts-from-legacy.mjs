/**
 * Sync college/directorate contact + map from legacy hau_college → Supabase.
 *
 * Fields: college_address, college_email, college_landline, latitude, longitude
 * Rules:
 *  - Never overwrite Supabase with null/empty legacy values
 *  - If lat+lng both present → layout_config.contacts = true + set map_lat/map_lng
 *  - If lat or lng missing → layout_config.contacts = false (do not clear existing map_*)
 *
 * Usage:
 *   node sync-college-contacts-from-legacy.mjs
 *   node sync-college-contacts-from-legacy.mjs --confirm
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const CONFIRM = process.argv.includes("--confirm");
const requireFromWeb = createRequire(join(ROOT, "apps/web/package.json"));
const { createClient } = requireFromWeb("@supabase/supabase-js");

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(join(ROOT, "apps/web/.env.local"));
loadEnv(join(ROOT, ".env.local"));

const SLUG_ALIASES = {
  "ic-college-of-home-science": "ic-college-of-community-science",
  "ic-college-community-science": "ic-college-of-community-science",
  "centre-food-science-technology": "centre-of-food-science-technology",
  "college-agricultural-engineering-technology":
    "college-of-agricultural-engineering-and-technology",
  "college-fisheries-science": "college-of-fisheries-science",
  "college-biotechnology": "college-of-biotechnology",
  "college-of-basic-sciences-humanities": "basic-sciences-humanities",
};

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanText(v) {
  if (v == null) return null;
  const s = String(v).replace(/\r\n/g, "\n").trim();
  return s.length ? s : null;
}

function parseCoord(v) {
  const s = cleanText(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizePhone(phone) {
  const p = cleanText(phone);
  if (!p) return null;
  return /^office\s*:/i.test(p) ? p : `Office : ${p}`;
}

function findLine(lines, ...keywords) {
  const lower = keywords.map((k) => k.toLowerCase());
  return lines.find((line) =>
    lower.some((k) => String(line.label_en || "").toLowerCase().includes(k)),
  );
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: pages, error: pagesErr } = await sb
  .from("ccshau_pages")
  .select(
    "id, slug, title_en, page_type, layout_template, layout_config, map_lat, map_lng, status",
  )
  .eq("page_type", "college")
  .order("title_en");
if (pagesErr) throw new Error(pagesErr.message);

const pagesBySlug = new Map((pages || []).map((p) => [p.slug, p]));

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const [legacyRows] = await conn.query(
  `SELECT college_id, college_name, college_slug, type, college_status,
          college_address, college_email, college_landline, latitude, longitude
   FROM hau_college
   WHERE college_status = '1'
   ORDER BY type, college_id`,
);
await conn.end();

function resolvePages(legacy) {
  const rawSlug = legacy.college_slug || slugify(legacy.college_name);
  const preferred = SLUG_ALIASES[rawSlug];
  const candidates = [
    preferred,
    rawSlug,
    slugify(legacy.college_name),
    SLUG_ALIASES[slugify(legacy.college_name)],
  ].filter(Boolean);

  const found = [];
  const seen = new Set();
  for (const s of candidates) {
    const p = pagesBySlug.get(s);
    if (p && !seen.has(p.id)) {
      found.push(p);
      seen.add(p.id);
    }
  }

  // Also keep deprecated twin pages in sync (e.g. home-science ↔ community-science)
  if (preferred && pagesBySlug.has(rawSlug) && rawSlug !== preferred) {
    const twin = pagesBySlug.get(rawSlug);
    if (twin && !seen.has(twin.id)) {
      found.push(twin);
      seen.add(twin.id);
    }
  }

  if (found.length) return found;

  const tokens = slugify(legacy.college_name).split("-").filter((t) => t.length > 3);
  if (tokens.length >= 2) {
    for (const p of pages || []) {
      const hit = tokens.filter((t) => p.slug.includes(t)).length;
      if (hit >= Math.min(3, tokens.length)) return [p];
    }
  }
  return [];
}

async function upsertContactLines(pageId, { address, phone, email }) {
  const { data: existing, error } = await sb
    .from("ccshau_page_contact_lines")
    .select("*")
    .eq("page_id", pageId)
    .order("sort_order");
  if (error) throw new Error(error.message);

  const lines = existing || [];
  const ops = [];

  if (address) {
    const row = findLine(lines, "mailing", "address");
    if (row) {
      ops.push({
        type: "update",
        id: row.id,
        patch: { value_en: address, value_hi: row.value_hi || address, is_active: true },
      });
    } else {
      ops.push({
        type: "insert",
        row: {
          page_id: pageId,
          label_en: "Mailing Address",
          label_hi: "डाक पता",
          value_en: address,
          value_hi: address,
          sort_order: 1,
          is_active: true,
        },
      });
    }
  }

  if (phone) {
    const row = findLine(lines, "office", "phone", "telephone");
    const value = normalizePhone(phone);
    if (row) {
      ops.push({
        type: "update",
        id: row.id,
        patch: { value_en: value, value_hi: value, is_active: true },
      });
    } else {
      ops.push({
        type: "insert",
        row: {
          page_id: pageId,
          label_en: "Office",
          label_hi: "कार्यालय",
          value_en: value,
          value_hi: value,
          sort_order: 2,
          is_active: true,
        },
      });
    }
  }

  if (email) {
    const row = findLine(lines, "email", "e-mail");
    if (row) {
      ops.push({
        type: "update",
        id: row.id,
        patch: { value_en: email, value_hi: email, is_active: true },
      });
    } else {
      ops.push({
        type: "insert",
        row: {
          page_id: pageId,
          label_en: "Email Id",
          label_hi: "ई-मेल आईडी",
          value_en: email,
          value_hi: email,
          sort_order: 3,
          is_active: true,
        },
      });
    }
  }

  if (!CONFIRM) return ops;

  for (const op of ops) {
    if (op.type === "update") {
      const { error: e } = await sb
        .from("ccshau_page_contact_lines")
        .update(op.patch)
        .eq("id", op.id);
      if (e) throw new Error(e.message);
    } else {
      const { error: e } = await sb.from("ccshau_page_contact_lines").insert(op.row);
      if (e) throw new Error(e.message);
    }
  }
  return ops;
}

const report = {
  mode: CONFIRM ? "apply" : "dry-run",
  legacyTotal: legacyRows.length,
  enabledContact: [],
  disabledContact: [],
  contactLineUpdates: [],
  unmatched: [],
  skippedNoContactFields: [],
};

const touched = new Set();

for (const legacy of legacyRows) {
  const matchedPages = resolvePages(legacy);
  if (!matchedPages.length) {
    report.unmatched.push({
      id: legacy.college_id,
      name: legacy.college_name,
      slug: legacy.college_slug,
    });
    continue;
  }

  const address = cleanText(legacy.college_address);
  const email = cleanText(legacy.college_email);
  const phone = cleanText(legacy.college_landline);
  const lat = parseCoord(legacy.latitude);
  const lng = parseCoord(legacy.longitude);
  const hasCoords = lat != null && lng != null;
  const hasAnyContactField = Boolean(address || email || phone);

  for (const page of matchedPages) {
    if (touched.has(page.id)) continue;
    touched.add(page.id);

    const layoutConfig = {
      ...(page.layout_config && typeof page.layout_config === "object"
        ? page.layout_config
        : {}),
      contacts: hasCoords,
    };

    const pagePatch = { layout_config: layoutConfig };
    // Only write coords when legacy has them — never overwrite with null
    if (hasCoords) {
      pagePatch.map_lat = lat;
      pagePatch.map_lng = lng;
    }

    if (!hasCoords && !hasAnyContactField) {
      report.skippedNoContactFields.push({
        slug: page.slug,
        legacyId: legacy.college_id,
      });
    }

    const entry = {
      slug: page.slug,
      title: page.title_en,
      legacyId: legacy.college_id,
      hasCoords,
      address: address ? "(set)" : null,
      email: email || null,
      phone: phone || null,
      lat: hasCoords ? lat : null,
      lng: hasCoords ? lng : null,
      contactsEnabled: hasCoords,
    };

    if (hasCoords) report.enabledContact.push(entry);
    else report.disabledContact.push(entry);

    if (CONFIRM) {
      const { error: upErr } = await sb
        .from("ccshau_pages")
        .update(pagePatch)
        .eq("id", page.id);
      if (upErr) throw new Error(`${page.slug}: ${upErr.message}`);
    }

    if (hasAnyContactField) {
      const ops = await upsertContactLines(page.id, { address, phone, email });
      report.contactLineUpdates.push({
        slug: page.slug,
        ops: ops.map((o) =>
          o.type === "update"
            ? { type: "update", id: o.id, keys: Object.keys(o.patch) }
            : { type: "insert", label: o.row.label_en },
        ),
      });
    }
  }
}

mkdirSync(join(__dirname, "reports"), { recursive: true });
const out = join(__dirname, "reports", "sync-college-contacts-latest.json");
writeFileSync(out, JSON.stringify(report, null, 2));

console.log(
  JSON.stringify(
    {
      mode: report.mode,
      legacyTotal: report.legacyTotal,
      enabledContact: report.enabledContact.length,
      disabledContact: report.disabledContact.length,
      contactLineUpdates: report.contactLineUpdates.length,
      unmatched: report.unmatched.length,
      report: out,
    },
    null,
    2,
  ),
);

console.log("\nEnable contact (has lat+lng):");
for (const e of report.enabledContact) {
  console.log(` - ${e.slug} lat=${e.lat} lng=${e.lng}`);
}
console.log("\nDisable contact (missing lat/lng):");
for (const e of report.disabledContact.slice(0, 15)) {
  console.log(` - ${e.slug}`);
}
if (report.disabledContact.length > 15) {
  console.log(` ... +${report.disabledContact.length - 15} more`);
}
if (report.unmatched.length) {
  console.log("\nUnmatched legacy:");
  for (const u of report.unmatched) console.log(` - ${u.id} ${u.name}`);
}
