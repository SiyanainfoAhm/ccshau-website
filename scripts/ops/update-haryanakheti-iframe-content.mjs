// From apps/web: node --env-file=.env.local ../../scripts/ops/update-haryanakheti-iframe-content.mjs [--apply]
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { sanitizeCmsHtml, normalizeCmsHtml } from '../../apps/web/src/lib/html/sanitize-cms-html.ts';

const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');
const { parseDocument } = require('htmlparser2');
const { findAll, textContent } = require('domutils');
const key = Object.keys(process.env).find(key => key.replace(/^\uFEFF/, '') === 'NEXT_PUBLIC_SUPABASE_URL');
const db = createClient(process.env[key], process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const apply = process.argv.includes('--apply');
const { data: page, error } = await db.from('ccshau_pages')
  .select('id,slug,content_en,content_hi,updated_at').eq('slug', 'haryanakheti').single();
if (error) throw error;

function links(html) {
  const document = parseDocument(sanitizeCmsHtml(normalizeCmsHtml(html || '')));
  const books = new Map();
  for (const anchor of findAll(node => node.name === 'a' && /\.pdf(?:$|[?#])/i.test(node.attribs?.href || ''), document.children)) {
    const href = anchor.attribs.href.split('#')[0];
    const title = textContent(anchor).replace(/\s+/g, ' ').trim();
    if (!books.has(href) || title) books.set(href, title || books.get(href) || 'Haryana Kheti');
  }
  return books;
}
const en = links(page.content_en);
const hi = links(page.content_hi);
const urls = Array.from(new Set([...en.keys(), ...hi.keys()]));
if (!urls.length) throw new Error('No PDF books found; no content changed.');
const months = [['January','जनवरी'],['February','फरवरी'],['March','मार्च'],['April','अप्रैल'],['May','मई'],['June','जून'],['July','जुलाई'],['August','अगस्त'],['September','सितंबर'],['October','अक्टूबर'],['November','नवंबर'],['December','दिसंबर']];
function label(title, lang) {
  title = title.replace(/हरियाणा\s*खेती/g, lang === 'en' ? 'Haryana Kheti' : 'हरियाणा खेती')
    .replace(/Haryana\s*Kheti/gi, lang === 'en' ? 'Haryana Kheti' : 'हरियाणा खेती');
  for (const [english, hindi] of months) {
    title = lang === 'en' ? title.replaceAll(hindi, english) : title.replace(new RegExp(`\\b${english}\\b`, 'gi'), hindi);
  }
  return title;
}
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function card(href, title, lang) {
  return `<div style="width:175px;max-width:100%;border:1px solid #bbdfc5;border-radius:8px;overflow:hidden;box-sizing:border-box;">
  <iframe src="${escape(href)}#page=1&amp;view=FitH&amp;toolbar=0&amp;navpanes=0" title="${escape(title)}" width="175" height="235" loading="lazy" style="display:block;width:100%;height:235px;min-height:0;border:0;"></iframe>
  <h3 style="margin:0;padding:8px;text-align:center;">${escape(title)}</h3>
  <a href="${escape(href)}" target="_blank" rel="noopener noreferrer" style="display:block;padding:0 8px 10px;text-align:center;">${lang === 'en' ? 'Open PDF' : 'पीडीएफ खोलें'}</a>
</div>`;
}
function content(lang) {
  const source = lang === 'en' ? en : hi;
  const fallback = lang === 'en' ? hi : en;
  return `<h2 style="text-align:center;">${lang === 'en' ? 'Haryana Kheti' : 'हरियाणा खेती'}</h2>
<div style="display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:16px;">
${urls.map(href => card(href, label(source.get(href) || fallback.get(href), lang), lang)).join('\n')}
</div>`;
}
const content_en = content('en');
const content_hi = content('hi');
for (const html of [content_en, content_hi]) {
  const sanitized = sanitizeCmsHtml(html);
  if ((sanitized.match(/<iframe\b/g) || []).length !== urls.length || !sanitized.includes('height:235px;min-height:0')) {
    throw new Error('CMS sanitization would remove previews or their sizing.');
  }
}
const directory = fileURLToPath(new URL('./reports/haryanakheti-iframe/', import.meta.url));
await mkdir(directory, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
await writeFile(`${directory}/backup-${stamp}.json`, JSON.stringify(page, null, 2));
await writeFile(`${directory}/content-en.html`, content_en);
await writeFile(`${directory}/content-hi.html`, content_hi);
await writeFile(`${directory}/new-book-template.html`, card('https://ccshau.blob.core.windows.net/ccshaucontainer/REPLACE-WITH-BOOK.pdf', 'REPLACE WITH BOOK TITLE', 'en'));
await writeFile(`${directory}/README.txt`, 'Admin > Pages > Haryana Kheti > Content (English/Hindi) > HTML.\nCopy a whole book <div> inside the outer flex container. Replace the PDF URL in BOTH iframe src and link href, and replace iframe title and h3 book title.\nEdit width:175px on the card and iframe height:235px to resize. Edit gap:16px on the outer container to change spacing.\nRepeat in both languages, then click Update page.\n');
console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', pageId: page.id, englishBooks: en.size, hindiBooks: hi.size, cardsPerLanguage: urls.length, directory }));
if (apply) {
  let update = db.from('ccshau_pages').update({ content_en, content_hi, updated_at: new Date().toISOString() }).eq('id', page.id);
  if (page.updated_at) update = update.eq('updated_at', page.updated_at);
  const { data: saved, error: updateError } = await update.select('id').single();
  if (updateError) throw updateError;
  const { data: verified, error: verifyError } = await db.from('ccshau_pages').select('content_en,content_hi').eq('id', saved.id).single();
  if (verifyError) throw verifyError;
  if (verified.content_en !== content_en || verified.content_hi !== content_hi) throw new Error('Saved content verification failed.');
  console.log('Verified saved iframe HTML in both languages.');
}
