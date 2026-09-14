#!/usr/bin/env node
/**
 * Upload homepage fallback images (dignitaries, college logos, flagships, intro)
 * from the local HAU public dump into Azure legacy-images/homepage/*.
 *
 *   node scripts/legacy-import/sync-homepage-fallback-images.mjs --apply
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const APPLY = process.argv.includes("--apply");
const UPLOADS =
  process.env.LEGACY_UPLOADS_ROOT?.trim() ||
  "C:\\Jatin\\Projects\\CCHAU_mysql\\public\\public";
const CONTAINER =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER?.trim() ||
  process.env.AZURE_STORAGE_CONTAINER?.trim() ||
  "ccshaucontainer";
const ACCOUNT =
  process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT?.trim() ||
  process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim() ||
  "ccshau";
const AZURE_PUBLIC = `https://${ACCOUNT}.blob.core.windows.net/${CONTAINER}`;

/** @type {{ key: string, local: string, blob: string }[]} */
const ASSETS = [
  // Dignitaries
  {
    key: "dignitary-murmu",
    local: "images/speakers/5/1662633138.jpg",
    blob: "legacy-images/homepage/dignitaries/droupadi-murmu.jpg",
  },
  {
    key: "dignitary-modi",
    local: "images/speakers/4/1662633149.jpg",
    blob: "legacy-images/homepage/dignitaries/narendra-modi.jpg",
  },
  {
    key: "dignitary-ghosh",
    local: "images/speakers/3/1767765134.jpg",
    blob: "legacy-images/homepage/dignitaries/ashim-kumar-ghosh.jpg",
  },
  {
    key: "dignitary-saini",
    local: "images/speakers/2/1722239329.jpeg",
    blob: "legacy-images/homepage/dignitaries/nayab-singh-saini.jpeg",
  },
  // College logos
  {
    key: "logo-hisar",
    local: "images/college/logo/2/1540803791.jpg",
    blob: "legacy-images/homepage/colleges/college-of-agriculture-hisar.jpg",
  },
  {
    key: "logo-kaul",
    local: "images/college/logo/6/1540803865.jpg",
    blob: "legacy-images/homepage/colleges/college-of-agriculture-kaul.jpg",
  },
  {
    key: "logo-bawal",
    local: "images/college/logo/7/1552737173.jpg",
    blob: "legacy-images/homepage/colleges/college-of-agriculture-bawal.jpg",
  },
  {
    key: "logo-icccs",
    local: "images/college/logo/9/1741857160.jpg",
    blob: "legacy-images/homepage/colleges/ic-college-of-community-science.jpg",
  },
  {
    key: "logo-cobsh",
    local: "images/college/logo/10/1540803999.jpg",
    blob: "legacy-images/homepage/colleges/college-of-basic-sciences-humanities.jpg",
  },
  {
    key: "logo-coaet",
    local: "images/college/logo/11/1538048892.png",
    blob: "legacy-images/homepage/colleges/college-of-agricultural-engineering-and-technology.png",
  },
  {
    key: "logo-fisheries",
    local: "images/college/logo/65/1716002752.png",
    blob: "legacy-images/homepage/colleges/college-of-fisheries-science.png",
  },
  {
    key: "logo-biotech",
    local: "images/college/logo/67/1782193277.jpg",
    blob: "legacy-images/homepage/colleges/college-of-biotechnology.jpg",
  },
  // Flagships
  {
    key: "flagship-abic",
    local: "images/college/banner/68/1689051816.JPG",
    blob: "legacy-images/homepage/flagships/agribusiness-incubation-centre.JPG",
  },
  {
    key: "flagship-bionano",
    local: "images/college/banner/66/1581499566.jpg",
    blob: "legacy-images/homepage/flagships/centre-for-bio-nanotechnology.jpg",
  },
  {
    key: "flagship-rkvy",
    local: "images/college/banner/64/1555063867.JPG",
    blob: "legacy-images/homepage/flagships/rkvy-raftaar.JPG",
  },
  {
    key: "flagship-idp",
    local: "images/college/banner/44/1624419644.jpg",
    blob: "legacy-images/homepage/flagships/institutional-development-plan.jpg",
  },
  {
    key: "flagship-skill",
    local: "images/college/banner/43/1731475495.png",
    blob: "legacy-images/homepage/flagships/skill-council-of-india.png",
  },
  // College page intro hero
  {
    key: "intro",
    local: "images/intro.jpg",
    blob: "legacy-images/homepage/intro.jpg",
  },
];

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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
const { BlobServiceClient, StorageSharedKeyCredential } = requireFromWeb("@azure/storage-blob");

function contentType(fileName) {
  const ext = extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

function getBlobService() {
  const cs = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  if (cs) return BlobServiceClient.fromConnectionString(cs);
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME?.trim();
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY?.trim();
  if (accountName && accountKey) {
    return new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new StorageSharedKeyCredential(accountName, accountKey),
    );
  }
  throw new Error("Azure Storage credentials missing.");
}

async function main() {
  console.log({ mode: APPLY ? "APPLY" : "dry-run", uploadsRoot: UPLOADS, azurePublic: AZURE_PUBLIC });
  const report = [];
  for (const asset of ASSETS) {
    const localPath = join(UPLOADS, asset.local);
    const exists = existsSync(localPath);
    console.log(exists ? "OK" : "MISSING", asset.key, localPath);
    report.push({
      key: asset.key,
      blob: asset.blob,
      url: `${AZURE_PUBLIC}/${asset.blob}`,
      local: localPath,
      exists,
    });
  }
  if (!APPLY) {
    console.log("Pass --apply to upload.");
    writeFileSync(
      join(__dirname, "reports/homepage-fallback-images-plan.json"),
      JSON.stringify(report, null, 2),
    );
    return;
  }

  const container = getBlobService().getContainerClient(CONTAINER);
  const out = [];
  for (const asset of ASSETS) {
    const localPath = join(UPLOADS, asset.local);
    if (!existsSync(localPath)) {
      out.push({ key: asset.key, status: "missing-local" });
      continue;
    }
    const blob = container.getBlockBlobClient(asset.blob);
    if (await blob.exists()) {
      console.log("exists", asset.blob);
      out.push({ key: asset.key, status: "exists", url: `${AZURE_PUBLIC}/${asset.blob}` });
      continue;
    }
    const buf = await readFile(localPath);
    await blob.uploadData(buf, {
      blobHTTPHeaders: { blobContentType: contentType(asset.blob) },
    });
    console.log("uploaded", asset.blob, buf.length);
    out.push({
      key: asset.key,
      status: "uploaded",
      url: `${AZURE_PUBLIC}/${asset.blob}`,
      bytes: buf.length,
    });
  }

  // Also copy intro.jpg into Next public/ for static fallback
  const introSrc = join(UPLOADS, "images/intro.jpg");
  const introDest = join(ROOT, "apps/web/public/images/intro.jpg");
  if (existsSync(introSrc)) {
    mkdirSync(dirname(introDest), { recursive: true });
    writeFileSync(introDest, await readFile(introSrc));
    console.log("copied public", introDest);
    out.push({ key: "intro-public", status: "copied", path: "/images/intro.jpg" });
  }

  mkdirSync(join(__dirname, "reports"), { recursive: true });
  writeFileSync(
    join(__dirname, "reports/homepage-fallback-images.json"),
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
