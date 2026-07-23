#!/usr/bin/env node
/**
 * Verify Supabase managed daily backups via Management API.
 *
 * Env:
 *   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF   — default fvveqziyusjgqejowkfp
 *
 * Exit codes: 0 ok, 1 config/API error, 2 no recent backup
 */
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "fvveqziyusjgqejowkfp";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function main() {
  if (!TOKEN) {
    console.error(
      "Missing SUPABASE_ACCESS_TOKEN.\n" +
        "Create one at https://supabase.com/dashboard/account/tokens\n" +
        "Then: set SUPABASE_ACCESS_TOKEN=sbp_... && node scripts/ops/verify-supabase-backups.mjs",
    );
    console.error(
      "\nNote: Org plan is Pro — daily DB backups are automatic.\n" +
        "You can also verify visually: Dashboard → Database → Backups → Scheduled.",
    );
    process.exit(1);
  }

  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/backups`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Management API error ${res.status}: ${body}`);
    process.exit(1);
  }

  const payload = await res.json();
  const backups = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.backups)
      ? payload.backups
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  console.log(`Project: ${PROJECT_REF}`);
  console.log(`Backups returned: ${backups.length}`);

  if (backups.length === 0) {
    console.error(
      "No backups listed. On Pro, wait for the first daily backup cycle or check Dashboard → Database → Backups.",
    );
    process.exit(2);
  }

  const rows = backups.map((b) => ({
    id: b.id ?? b.backup_id ?? null,
    status: b.status ?? b.health ?? null,
    inserted_at: b.inserted_at ?? b.created_at ?? b.time ?? null,
    type: b.type ?? b.backup_type ?? null,
  }));

  console.table(rows.slice(0, 14));

  const newest = rows
    .map((r) => (r.inserted_at ? Date.parse(r.inserted_at) : NaN))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a)[0];

  if (!newest) {
    console.log("Could not parse backup timestamps; listed rows above for manual review.");
    process.exit(0);
  }

  const ageHours = (Date.now() - newest) / (1000 * 60 * 60);
  console.log(`Newest backup age: ${ageHours.toFixed(1)} hours`);

  if (ageHours > 48) {
    console.error("WARNING: newest backup is older than 48 hours — investigate in Dashboard.");
    process.exit(2);
  }

  console.log("OK: recent managed backup present.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
