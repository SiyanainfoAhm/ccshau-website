// From apps/web: node --env-file=.env.local ../../scripts/ops/audit-repair-download-files.mjs [--apply]
import { createRequire } from 'node:module';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { createHash } from 'node:crypto';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');
const { BlobServiceClient } = require('@azure/storage-blob');
const envKey = Object.keys(process.env).find(k => k.replace(/^\uFEFF/, '') === 'NEXT_PUBLIC_SUPABASE_URL');
const db = createClient(process.env[envKey], process.env.SUPABASE_SERVICE_ROLE_KEY);
const azure = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const container = process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER || process.env.AZURE_STORAGE_CONTAINER || 'ccshaucontainer';
const apply = process.argv.includes('--apply');
const index = new Map();
async function indexFiles(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await indexFiles(path);
    else if (entry.isFile()) {
      const key = entry.name.toLowerCase();
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(path);
    }
  }
}
await indexFiles(process.env.LEGACY_STORAGE_UPLOADS_ROOT || 'C:/Jatin/Projects/CCHAU_mysql/uploads/uploads');
await indexFiles(process.env.LEGACY_UPLOADS_ROOT || 'C:/Jatin/Projects/CCHAU_mysql/public/public');
const rows = [];
for (let start = 0; ; start += 500) {
  const { data, error } = await db.from('ccshau_downloads').select('id,title_en,file_path,file_name,status,is_public,expires_at').order('id').range(start, start + 499);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 500) break;
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function contentType(bytes, filename) {
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'image/png';
  if (bytes.subarray(0, 3).toString('hex') === 'ffd8ff') return 'image/jpeg';
  if (bytes.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (bytes.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1') return extname(filename).toLowerCase() === '.xls' ? 'application/vnd.ms-excel' : 'application/msword';
  if (bytes.subarray(0, 2).toString() === 'PK') {
    if (extname(filename).toLowerCase() === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (extname(filename).toLowerCase() === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  throw new Error('Unrecognized source document type');
}
function storedUrl(path) {
  if (!path || path === 'pending' || path.startsWith('legacy-pending/')) return null;
  if (/^https?:\/\//.test(path)) return path;
  const slash = path.indexOf('/');
  if (slash < 0) return null;
  let bucket = path.slice(0, slash);
  if (['ccshau-public', 'ccshau-private', 'ccshau-media'].includes(bucket)) bucket = container;
  const base = process.env.NEXT_PUBLIC_AZURE_STORAGE_BASE_URL || `https://${process.env.NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`;
  return `${base.replace(/\/$/, '')}/${bucket}/${path.slice(slash + 1).split('/').map(encodeURIComponent).join('/')}`;
}
async function probe(url) {
  if (!url) return { ok: false, reason: 'Missing or placeholder path' };
  try {
    const response = await fetch(url, { headers: { Range: 'bytes=0-7' }, signal: AbortSignal.timeout(20000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    const type = response.headers.get('content-type') || '';
    return { ok: response.ok && bytes.length > 0 && !/^(text\/html|application\/(xml|json))(;|$)/.test(type), status: response.status, type };
  } catch (e) { return { ok: false, reason: e.message }; }
}
const report = { mode: apply ? 'apply' : 'audit', total: rows.length, healthy: 0, repaired: 0, repairable: 0, unresolved: [], entries: [] };
for (const row of rows) {
  const before = await probe(storedUrl(row.file_path));
  const entry = { id: row.id, title: row.title_en, originalPath: row.file_path, before };
  report.entries.push(entry);
  if (before.ok) { report.healthy++; continue; }
  try {
    const filename = basename((row.file_name || row.file_path || '').replace(/\\/g, '/'));
    const candidates = index.get(filename.toLowerCase()) || [];
    if (!candidates.length) throw new Error('Original file not found in local backups');
    const bytes = await readFile(candidates[0]);
    for (const candidate of candidates.slice(1)) if (hash(await readFile(candidate)) !== hash(bytes)) throw new Error('Ambiguous originals with different contents');
    const type = contentType(bytes, filename);
    const blobPath = `downloads/${row.id}/${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const path = `${container}/${blobPath}`;
    entry.source = candidates[0];
    entry.repairedPath = path;
    report.repairable++;
    if (!apply) continue;
    const blob = azure.getContainerClient(container).getBlockBlobClient(blobPath);
    if (await blob.exists()) {
      if (hash(await blob.downloadToBuffer()) !== hash(bytes)) throw new Error('Existing blob differs; refusing overwrite');
    } else await blob.uploadData(bytes, { blobHTTPHeaders: { blobContentType: type } });
    if (hash(await blob.downloadToBuffer()) !== hash(bytes)) throw new Error('Uploaded file checksum mismatch');
    entry.after = await probe(storedUrl(path));
    // Internal documents are verified via authenticated Azure access; public files must also be accessible anonymously.
    if (row.status === 'published' && row.is_public && !entry.after.ok) throw new Error('Uploaded public file is inaccessible');
    let query = db.from('ccshau_downloads').update({ file_path: path, file_name: filename, file_size: bytes.length, mime_type: type }).eq('id', row.id);
    query = row.file_path === null ? query.is('file_path', null) : query.eq('file_path', row.file_path);
    const { data, error } = await query.select('id,file_path').single();
    if (error) throw error;
    entry.verifiedSha256 = hash(bytes);
    entry.result = data;
    report.repaired++;
    console.log(JSON.stringify({ repaired: row.id, title: row.title_en }));
  } catch (e) {
    entry.error = e.message;
    report.unresolved.push({ id: row.id, title: row.title_en, error: e.message });
  }
}
await mkdir(new URL('./reports/', import.meta.url), { recursive: true });
await writeFile(new URL(`./reports/download-files-${apply ? 'repair' : 'audit'}.json`, import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: report.total, healthy: report.healthy, repairable: report.repairable, repaired: report.repaired, unresolved: report.unresolved }));
