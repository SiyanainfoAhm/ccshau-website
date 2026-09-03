/** Free EN→HI translation helpers (Google gtx). */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateWithGoogleGtx(text) {
  try {
    const response = await fetch(
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `q=${encodeURIComponent(text)}`,
      },
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    return (
      data[0]
        .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
        .join("")
        .trim() || null
    );
  } catch {
    return null;
  }
}

function chunkPlainText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let splitAt = remaining.lastIndexOf("\n\n", maxLen);
    if (splitAt < maxLen * 0.4) splitAt = remaining.lastIndexOf(". ", maxLen);
    if (splitAt < maxLen * 0.4) splitAt = remaining.lastIndexOf(" ", maxLen);
    if (splitAt < maxLen * 0.4) splitAt = maxLen;
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export async function translatePlainEnToHi(text) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const chunks = chunkPlainText(trimmed, 1200);
  const parts = [];
  for (const chunk of chunks) {
    const part = await translateWithGoogleGtx(chunk);
    if (!part) return null;
    parts.push(part);
    await sleep(250);
  }
  return parts.join(trimmed.includes("\n\n") ? "\n\n" : " ");
}

function hasTranslatableLetters(text) {
  return /[A-Za-z]/.test(text);
}

export async function translateHtmlEnToHi(html) {
  const parts = html.split(/(<[^>]+>)/g);
  let translatedNodes = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (/^<[^>]+>$/.test(part) || !part.trim() || !hasTranslatableLetters(part)) continue;
    const hi = await translatePlainEnToHi(part);
    if (!hi) continue;
    parts[i] = hi;
    translatedNodes += 1;
    await sleep(200);
  }
  if (translatedNodes === 0) return null;
  return parts.join("");
}
