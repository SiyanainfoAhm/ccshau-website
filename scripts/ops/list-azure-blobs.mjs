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

const client = BlobServiceClient.fromConnectionString(cs);
const containerName =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() || "ccshaucontainer";
const container = client.getContainerClient(containerName);

console.log("account=", client.accountName);
console.log("container=", containerName);

try {
  const props = await container.getProperties();
  console.log("publicAccess=", props.blobPublicAccess ?? "(private)");
} catch (e) {
  console.log("props_error=", e.message?.slice(0, 200));
}

let n = 0;
for await (const b of container.listBlobsFlat()) {
  n += 1;
  if (n <= 40) {
    console.log("blob=", b.name, "size=", b.properties.contentLength);
  }
}
console.log("total_blobs=", n);

const probe =
  "banners/bf73786a-d748-4ad1-a75e-5abec50e9fa4/1738838709.png";
const exists = await container.getBlockBlobClient(probe).exists();
console.log("probe_exists=", probe, exists);
