import { createRequire } from "module";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(join(root, "apps/web/.env.local"));

const require = createRequire(join(root, "apps/web/package.json"));
const { BlobServiceClient } = require("@azure/storage-blob");
const cs = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!cs) {
  console.log("NO_CS");
  process.exit(1);
}

try {
  const client = BlobServiceClient.fromConnectionString(cs);
  console.log("account=", client.accountName);
  console.log("url=", client.url);
  const names = [];
  for await (const c of client.listContainers()) names.push(c.name);
  console.log("containers=", names.join(",") || "(none)");
} catch (e) {
  console.log("ERROR_NAME=", e?.name);
  console.log("ERROR_CODE=", e?.code || e?.details?.errorCode);
  console.log("ERROR_MSG=", String(e?.message || e).slice(0, 400));
  if (e?.cause) console.log("CAUSE=", String(e.cause).slice(0, 300));
}
