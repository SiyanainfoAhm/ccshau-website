// One-time content maintenance. Uses local PDF.js, canvas and sharp to render covers.
// From apps/web: node --env-file=.env.local ../../scripts/ops/update-haryanakheti-cover-content.mjs [--apply]
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join, basename, dirname } from 'node:path';
import { sanitizeCmsHtml, normalizeCmsHtml } from '../../apps/web/src/lib/html/sanitize-cms-html.ts';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');
const { BlobServiceClient } = require('@azure/storage-blob');
const { parseDocument } = require('htmlparser2');
const { findAll, findOne, textContent } = require('domutils');
const sharp = require('sharp');
const key = Object.keys(process.env).find(key => key.replace(/^\uFEFF/, '') === 'NEXT_PUBLIC_SUPABASE_URL');
const db = createClient(process.env[key], process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const service = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerName = process.env.NEXT_PUBLIC_AZURE_STORAGE_CONTAINER || process.env.AZURE_STORAGE_CONTAINER || 'ccshaucontainer';
const container = service.getContainerClient(containerName);
const directory = fileURLToPath(new URL('./reports/haryanakheti-covers/', import.meta.url));
await mkdir(directory, { recursive: true });
const manifestPath = join(directory, 'manifest.json');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const selectPage = () => db.from('ccshau_pages').select('id,slug,content_en,content_hi,updated_at').eq('slug', 'haryanakheti').single();

if (process.argv.includes('--verify')) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const { data: saved, error } = await selectPage();
  if (error) throw error;
  if (saved.content_en !== manifest.content_en || saved.content_hi !== manifest.content_hi) throw new Error('Content differs from manifest');
  const publicContainer = new BlobServiceClient(service.url).getContainerClient(containerName);
  for (const cover of manifest.covers) {
    const properties = await publicContainer.getBlockBlobClient(cover.blobPath).getProperties();
    if (properties.contentType !== 'image/webp' || properties.contentLength !== cover.bytes) {
      throw new Error(`Public image verification failed: ${cover.filename}`);
    }
  }
  console.log(JSON.stringify({ publicCoversVerified: manifest.covers.length, iframeCount: (saved.content_en + saved.content_hi).match(/<iframe\b/g)?.length || 0, englishImages: (saved.content_en.match(/<img\b/g) || []).length, hindiImages: (saved.content_hi.match(/<img\b/g) || []).length }));
  process.exit(0);
}

if (process.argv.includes('--apply')) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const { data: current, error } = await selectPage();
  if (error) throw error;
  if (current.id !== manifest.original.id || current.content_en !== manifest.original.content_en || current.content_hi !== manifest.original.content_hi || current.updated_at !== manifest.original.updated_at) {
    throw new Error('Page changed after preview. Generate and inspect a new preview before applying.');
  }
  for (const cover of manifest.covers) {
    const bytes = await readFile(join(directory, cover.filename));
    const blob = container.getBlockBlobClient(cover.blobPath);
    if (!await blob.exists()) {
      await blob.uploadData(bytes, { blobHTTPHeaders: { blobContentType: 'image/webp', blobCacheControl: 'public, max-age=31536000, immutable' } });
    }
    const stored = await blob.downloadToBuffer();
    if (!stored.equals(bytes)) throw new Error(`Uploaded cover differs: ${cover.filename}`);
  }
  await writeFile(join(directory, `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`), JSON.stringify(current, null, 2));
  let query = db.from('ccshau_pages').update({ content_en: manifest.content_en, content_hi: manifest.content_hi, updated_at: new Date().toISOString() }).eq('id', current.id);
  if (current.updated_at) query = query.eq('updated_at', current.updated_at);
  const { error: updateError } = await query.select('id').single();
  if (updateError) throw updateError;
  const { data: verified, error: verifyError } = await selectPage();
  if (verifyError) throw verifyError;
  if (verified.content_en !== manifest.content_en || verified.content_hi !== manifest.content_hi) throw new Error('Content verification failed');
  console.log(JSON.stringify({ verified: true, coversUploaded: manifest.covers.length, bytesTotal: manifest.covers.reduce((sum, cover) => sum + cover.bytes, 0), languages: ['en', 'hi'] }));
  process.exit(0);
}

const { data: original, error } = await selectPage();
if (error) throw error;
function books(html) {
  const document = parseDocument(sanitizeCmsHtml(normalizeCmsHtml(html || '')));
  const result = new Map();
  for (const frame of findAll(node => node.name === 'iframe' && /\.pdf(?:$|[?#])/i.test(node.attribs?.src || ''), document.children)) {
    const title = findOne(node => /^h[1-6]$/.test(node.name || ''), frame.parent.children);
    result.set(frame.attribs.src.split('#')[0], title ? textContent(title).trim() : frame.attribs.title);
  }
  for (const anchor of findAll(node => node.name === 'a' && /\.pdf(?:$|[?#])/i.test(node.attribs?.href || ''), document.children)) {
    const href = anchor.attribs.href.split('#')[0];
    if (!result.has(href)) result.set(href, textContent(anchor).trim());
  }
  return result;
}
const en = books(original.content_en);
const hi = books(original.content_hi);
const urls = Array.from(new Set([...en.keys(), ...hi.keys()]));
if (!urls.length) throw new Error('No books found');
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
const { createCanvas } = require('@napi-rs/canvas');
const pdfRuntime = dirname(require.resolve('pdfjs-dist/package.json')).replaceAll('\\', '/');
const covers = [];
for (const [index, href] of urls.entries()) {
  const url = new URL(href);
  const pdfName = decodeURIComponent(basename(url.pathname));
  const local = join('C:/Jatin/Projects/CCHAU_mysql/uploads/uploads', pdfName);
  let bytes;
  if (existsSync(local)) bytes = await readFile(local);
  else {
    const segments = url.pathname.slice(1).split('/');
    const sourceContainer = segments.shift();
    if (url.hostname !== new URL(service.url).hostname) throw new Error('Unsupported PDF host');
    bytes = await service.getContainerClient(sourceContainer).getBlockBlobClient(decodeURIComponent(segments.join('/'))).downloadToBuffer();
  }
  const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, wasmUrl: `${pdfRuntime}/wasm/`, cMapUrl: `${pdfRuntime}/cmaps/`, cMapPacked: true, standardFontDataUrl: `${pdfRuntime}/standard_fonts/` });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const size = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 350 / size.width });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
    const image = await sharp(canvas.toBuffer('image/png')).webp({ quality: 78 }).toBuffer();
    const digest = createHash('sha256').update(image).digest('hex').slice(0, 12);
    const filename = `${pdfName.replace(/\.pdf$/i, '')}-${digest}.webp`;
    const blobPath = `publication-covers/haryanakheti/${filename}`;
    await writeFile(join(directory, filename), image);
    const metadata = await sharp(image).metadata();
    covers.push({ href, filename, blobPath, url: container.getBlockBlobClient(blobPath).url, bytes: image.length, pdfBytes: bytes.length, width: metadata.width, height: metadata.height });
    console.log(JSON.stringify({ book: index + 1, total: urls.length, coverBytes: image.length, title: en.get(href) || hi.get(href) }));
  } finally {
    await task.destroy();
  }
}
function card(cover, title, lang) {
  return `<div style="width:175px;max-width:100%;border:1px solid #bbdfc5;border-radius:8px;overflow:hidden;box-sizing:border-box;">
  <a href="${escape(cover.href)}" target="_blank" rel="noopener noreferrer" style="display:block;">
    <img src="${escape(cover.url)}" alt="${escape(title)}" width="${cover.width}" height="${cover.height}" loading="lazy" style="display:block;width:100%;height:235px;object-fit:contain;margin:0;" />
  </a>
  <h3 style="margin:0;padding:8px;text-align:center;">${escape(title)}</h3>
  <a href="${escape(cover.href)}" target="_blank" rel="noopener noreferrer" style="display:block;padding:0 8px 10px;text-align:center;">${lang === 'en' ? 'Open PDF' : 'पीडीएफ खोलें'}</a>
</div>`;
}
function content(lang) {
  const titles = lang === 'en' ? en : hi;
  return `<h2 style="text-align:center;">${lang === 'en' ? 'Haryana Kheti' : 'हरियाणा खेती'}</h2>
<div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:16px;">
${covers.map(cover => card(cover, titles.get(cover.href) || en.get(cover.href) || hi.get(cover.href), lang)).join('\n')}
</div>`;
}
const manifest = { original, covers, content_en: content('en'), content_hi: content('hi') };
for (const html of [manifest.content_en, manifest.content_hi]) {
  const sanitized = sanitizeCmsHtml(html);
  if (sanitized.includes('<iframe') || (sanitized.match(/<img\b/g) || []).length !== covers.length || !sanitized.includes('object-fit:contain')) throw new Error('CMS sanitization verification failed');
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
await writeFile(join(directory, 'content-en.html'), manifest.content_en);
await writeFile(join(directory, 'content-hi.html'), manifest.content_hi);
await writeFile(join(directory, 'new-book-template.html'), card({ href: 'REPLACE-PDF-URL', url: 'REPLACE-COVER-IMAGE-URL', width: 350, height: 470 }, 'REPLACE BOOK TITLE', 'en'));
await writeFile(join(directory, 'README.txt'), 'Admin > Haryana Kheti > Content > HTML. Copy a book card inside the outer flex container. Replace BOTH PDF href URLs, image src and alt, and h3 title. Repeat in English and Hindi, then Update page.\nCovers are static WebP images: opening the page does not download PDF files. Generate a first-page image for each future PDF and use its image URL.\n');
const tiles = await Promise.all(covers.map(async (cover, index) => ({ input: await sharp(join(directory, cover.filename)).resize(175, 235, { fit: 'contain', background: '#ffffff' }).png().toBuffer(), left: (index % 6) * 185, top: Math.floor(index / 6) * 245 })));
await sharp({ create: { width: 1110, height: Math.ceil(covers.length / 6) * 245, channels: 3, background: '#e8efe5' } }).composite(tiles).png().toFile(join(directory, 'contact-sheet.png'));
console.log(JSON.stringify({ previewReady: true, books: covers.length, coverBytes: covers.reduce((sum, cover) => sum + cover.bytes, 0), pdfBytes: covers.reduce((sum, cover) => sum + cover.pdfBytes, 0), directory }));
