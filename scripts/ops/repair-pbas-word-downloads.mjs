// Run from apps/web: node --env-file=.env.local ../../scripts/ops/repair-pbas-word-downloads.mjs [--apply]
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');
const { BlobServiceClient } = require('@azure/storage-blob');
const urlKey = Object.keys(process.env).find(key => key.replace(/^\uFEFF/, '') === 'NEXT_PUBLIC_SUPABASE_URL');
const db = createClient(process.env[urlKey], process.env.SUPABASE_SERVICE_ROLE_KEY);
const container = process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER || process.env.AZURE_STORAGE_CONTAINER || 'ccshaucontainer';
const title = 'Approve the Academic Performance Indicators (API) based on Performance Based Appraisal System (PBAS) for promotion of teachers (word file)';
const ids = ['ba90041d-369f-4872-9f04-935666321384', '6a01a214-00ec-4683-99b7-4967026c7021'];
const { data: rows, error } = await db.from('ccshau_downloads').select('id,title_en,file_path,file_name').in('id', ids);
if (error) throw error;
if (rows.length !== ids.length) throw new Error('Expected both PBAS Word records');
const hash = data => createHash('sha256').update(data).digest('hex');
for (const row of rows) {
  if (row.title_en !== title || !/^[a-zA-Z0-9]+\.doc$/.test(row.file_name)) throw new Error('Unexpected record');
  const blobPath = `downloads/${row.id}/${row.file_name}`;
  const repairedPath = `${container}/${blobPath}`;
  if (!row.file_path.startsWith('legacy-pending/downloads/') && row.file_path !== repairedPath) throw new Error('Path changed; refusing overwrite');
  const bytes = await readFile(`C:/Jatin/Projects/CCHAU_mysql/uploads/uploads/downloads-pdf/${row.file_name}`);
  if (bytes.subarray(0, 8).toString('hex') !== 'd0cf11e0a1b11ae1') throw new Error('Source is not a legacy Word document');
  console.log(JSON.stringify({ id: row.id, currentPath: row.file_path, repairedPath, bytes: bytes.length }));
  if (!process.argv.includes('--apply')) continue;
  const blob = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING).getContainerClient(container).getBlockBlobClient(blobPath);
  if (!(await blob.exists())) await blob.uploadData(bytes, { blobHTTPHeaders: { blobContentType: 'application/msword' } });
  if (hash(await blob.downloadToBuffer()) !== hash(bytes)) throw new Error('Uploaded document differs from original');
  const { data: updated, error: updateError } = await db.from('ccshau_downloads').update({ file_path: repairedPath, file_size: bytes.length, mime_type: 'application/msword' }).eq('id', row.id).eq('file_path', row.file_path).select('id,file_path').single();
  if (updateError) throw updateError;
  console.log(JSON.stringify({ repaired: updated, verifiedSha256: hash(bytes) }));
}
