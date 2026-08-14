/**
 * Backfill faculty Detail content from legacy users.other_activity
 * → ccshau_page_staff.detail_content_en (matched by staff_slug = legacy-user-{id})
 *
 * Usage:
 *   node apply-faculty-details.mjs --dry-run
 *   node apply-faculty-details.mjs --confirm
 */
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const REPORT_DIR = join(__dirname, "reports");
const CONFIRM = process.argv.includes("--confirm");
const DRY_RUN = process.argv.includes("--dry-run");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(ROOT, "apps/web/.env.local"));
loadEnvFile(join(ROOT, ".env.local"));

const { createClient } = createRequire(join(ROOT, "apps/web/package.json"))(
  "@supabase/supabase-js",
);

function hasMeaningfulDetail(raw) {
  if (raw == null) return false;
  const s = String(raw).trim();
  if (!s) return false;
  // Strip empty HTML wrappers
  const text = s
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
  return text.length > 0 || /<img\s/i.test(s) || /<table/i.test(s);
}

async function main() {
  if (!CONFIRM && !DRY_RUN) {
    console.error("Use --confirm or --dry-run");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const conn = await mysql.createConnection({
    host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
    user: process.env.LEGACY_MYSQL_USER || "Admin",
    password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
    database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
  });

  const summary = {
    startedAt: new Date().toISOString(),
    mode: DRY_RUN ? "dry-run" : "apply",
    usersWithDetail: 0,
    usersEmpty: 0,
    staffRowsUpdated: 0,
    staffRowsMissing: 0,
    errors: [],
    samples: [],
  };

  console.log(`Faculty details backfill (${summary.mode})`);

  try {
    const [users] = await conn.query(
      `SELECT id, first_name, last_name, other_activity, designation, specialization, qualification
       FROM users
       WHERE status = '1'
         AND role_id IN (1, 2, 3)
       ORDER BY id`,
    );

    for (const row of users) {
      const userId = Number(row.id);
      const detail = row.other_activity;
      if (!hasMeaningfulDetail(detail)) {
        summary.usersEmpty += 1;
        continue;
      }
      summary.usersWithDetail += 1;

      const slug = `legacy-user-${userId}`;
      const { data: staffRows, error: findErr } = await supabase
        .from("ccshau_page_staff")
        .select("id, page_id, name_en, detail_content_en")
        .eq("staff_slug", slug);

      if (findErr) {
        summary.errors.push(`${slug}: ${findErr.message}`);
        continue;
      }

      const pending = (staffRows || []).filter(
        (row) => !String(row.detail_content_en || "").trim(),
      );
      if (!pending.length) {
        if (!staffRows?.length) summary.staffRowsMissing += 1;
        continue;
      }

      if (summary.samples.length < 5) {
        summary.samples.push({
          userId,
          name: [row.first_name, row.last_name].filter(Boolean).join(" "),
          slug,
          staffMatches: staffRows.length,
          detailLen: String(detail).length,
        });
      }

      if (DRY_RUN) {
        summary.staffRowsUpdated += pending.length;
        continue;
      }

      const { data: updated, error: updErr } = await supabase
        .from("ccshau_page_staff")
        .update({ detail_content_en: String(detail) })
        .in(
          "id",
          pending.map((row) => row.id),
        )
        .select("id");

      if (updErr) {
        summary.errors.push(`update ${slug}: ${updErr.message}`);
        continue;
      }
      summary.staffRowsUpdated += updated?.length ?? 0;
    }
  } finally {
    await conn.end();
  }

  if (!DRY_RUN) {
    const { count } = await supabase
      .from("ccshau_page_staff")
      .select("id", { count: "exact", head: true })
      .like("staff_slug", "legacy-user-%")
      .not("detail_content_en", "is", null);
    summary.staffWithDetailAfter = count ?? null;
  }

  summary.finishedAt = new Date().toISOString();
  mkdirSync(REPORT_DIR, { recursive: true });
  const out = join(REPORT_DIR, "faculty-details-latest.json");
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Report: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
