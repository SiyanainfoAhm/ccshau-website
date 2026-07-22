import { getGoogleTranslateApiKey } from "@/lib/secrets/google-translate-credentials";

const MYMEMORY_CHUNK_SIZE = 450;
const FREE_CHUNK_SIZE = 1200;
const FREE_CONCURRENCY = 2;

function chunkPlainText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
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

function joinChunks(original: string, chunks: string[], translated: string[]): string {
  if (chunks.length <= 1) return translated[0] ?? "";
  return translated.join(original.includes("\n\n") ? "\n\n" : " ");
}

function hasTranslatableLetters(text: string): boolean {
  return /[A-Za-z\u00C0-\u024F]/.test(text);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index]!, index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

async function translateWithGoogle(text: string, format: "text" | "html"): Promise<string | null> {
  const apiKey = await getGoogleTranslateApiKey();
  if (!apiKey) return null;

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "en",
        target: "hi",
        format,
      }),
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    data?: { translations?: { translatedText?: string }[] };
  };
  return data.data?.translations?.[0]?.translatedText ?? null;
}

/** Public Lingva mirror — reliable free EN→HI without an API key. */
async function translateWithLingva(text: string): Promise<string | null> {
  const endpoints = [
    "https://lingva.ml/api/v1/en/hi/",
    "https://lingva.thealien.moe/api/v1/en/hi/",
  ];

  for (const base of endpoints) {
    try {
      const response = await fetch(`${base}${encodeURIComponent(text)}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) continue;

      const data = (await response.json()) as { translation?: string };
      const translated = data.translation?.trim();
      if (translated) return translated;
    } catch {
      // try next mirror
    }
  }

  return null;
}

/** Unofficial Google Translate web endpoint. */
async function translateWithGoogleGtx(text: string, attempt = 0): Promise<string | null> {
  try {
    const response = await fetch(
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `q=${encodeURIComponent(text)}`,
      },
    );

    if (response.status === 429 && attempt < 2) {
      await sleep(600 * (attempt + 1));
      return translateWithGoogleGtx(text, attempt + 1);
    }

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json") && !contentType.includes("javascript")) {
      return null;
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;

    const translated = data[0]
      .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
      .join("")
      .trim();

    return translated || null;
  } catch {
    return null;
  }
}

async function translateWithMyMemory(text: string): Promise<string | null> {
  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", "en|hi");

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: string };
    };

    if (data.responseStatus !== 200) return null;

    const translated = data.responseData?.translatedText?.trim();
    if (!translated || translated.includes("MYMEMORY WARNING")) return null;
    return translated;
  } catch {
    return null;
  }
}

async function translateChunkFree(text: string): Promise<string | null> {
  return (
    (await translateWithLingva(text)) ??
    (await translateWithGoogleGtx(text)) ??
    (await translateWithMyMemory(text))
  );
}

async function translatePlainViaFreeProviders(text: string): Promise<string | null> {
  const chunks = chunkPlainText(text, FREE_CHUNK_SIZE);
  const translated: string[] = [];

  for (const chunk of chunks) {
    let part = await translateChunkFree(chunk);
    if (!part && chunk.length > 350) {
      const smaller = chunkPlainText(chunk, 350);
      const smallParts: string[] = [];
      for (const piece of smaller) {
        const translatedPiece = await translateChunkFree(piece);
        if (!translatedPiece) return null;
        smallParts.push(translatedPiece);
        await sleep(80);
      }
      part = smallParts.join(chunk.includes("\n\n") ? "\n\n" : " ");
    }
    if (!part) return null;
    translated.push(part);
    if (chunks.length > 1) await sleep(80);
  }

  return joinChunks(text, chunks, translated);
}

async function translatePlainEnToHi(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const google = await translateWithGoogle(trimmed, "text");
  if (google) return google;

  const free = await translatePlainViaFreeProviders(trimmed);
  if (free) return free;

  throw new Error(
    "Translation service is temporarily unavailable. Please try again in a minute.",
  );
}

/**
 * Translate HTML by replacing text nodes only (tags/attributes stay intact).
 * Individual node failures keep the English text so large profiles still partially succeed.
 */
async function translateHtmlTextNodes(html: string): Promise<string> {
  const parts = html.split(/(<[^>]+>)/g);
  const textIndexes: number[] = [];
  const uniqueTexts: string[] = [];
  const textKeyToUniqueIndex = new Map<string, number>();

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (/^<[^>]+>$/.test(part) || !part.trim() || !hasTranslatableLetters(part)) continue;

    textIndexes.push(i);
    if (!textKeyToUniqueIndex.has(part)) {
      textKeyToUniqueIndex.set(part, uniqueTexts.length);
      uniqueTexts.push(part);
    }
  }

  if (uniqueTexts.length === 0) return html;

  let translatedCount = 0;
  const translatedUniques = await mapPool(uniqueTexts, FREE_CONCURRENCY, async (text) => {
    const leading = text.match(/^\s*/)?.[0] ?? "";
    const trailing = text.match(/\s*$/)?.[0] ?? "";
    const core = text.slice(leading.length, text.length - trailing.length);
    if (!core) return text;

    try {
      const translatedCore = await translatePlainEnToHi(core);
      translatedCount += 1;
      return `${leading}${translatedCore}${trailing}`;
    } catch {
      return text;
    }
  });

  if (translatedCount === 0) {
    throw new Error(
      "Could not translate profile content right now. Please try Auto-translate again in a minute.",
    );
  }

  for (const index of textIndexes) {
    const original = parts[index]!;
    const uniqueIndex = textKeyToUniqueIndex.get(original);
    if (uniqueIndex == null) continue;
    parts[index] = translatedUniques[uniqueIndex]!;
  }

  return parts.join("");
}

async function translateHtmlEnToHi(html: string): Promise<string> {
  const google = await translateWithGoogle(html, "html");
  if (google) return google;

  // Prefer text-node translation for CMS HTML so tags/attributes stay intact.
  // Short pure-text-like HTML can still go through a free one-shot.
  if (html.length <= FREE_CHUNK_SIZE && !/[<>]/.test(html)) {
    const free = await translatePlainViaFreeProviders(html);
    if (free) return free;
  }

  return translateHtmlTextNodes(html);
}

export async function translateEnToHi(text: string, format: "text" | "html" = "text"): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  if (format === "html") {
    return translateHtmlEnToHi(trimmed);
  }

  return translatePlainEnToHi(trimmed);
}

export type TranslateFieldsResult = {
  translations: Record<string, string>;
  warnings: string[];
};

export async function translateFieldsEnToHi(
  fields: { key: string; text: string; format?: "text" | "html" }[],
): Promise<TranslateFieldsResult> {
  const translations: Record<string, string> = {};
  const warnings: string[] = [];

  for (const field of fields) {
    if (!field.text.trim()) continue;
    try {
      translations[field.key] = await translateEnToHi(field.text, field.format ?? "text");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Translation failed.";
      const label =
        field.key === "contentHi" || field.key === "detailContentHi"
          ? "Content (Hindi)"
          : field.key;
      warnings.push(`${label}: ${message}`);
    }
  }

  if (Object.keys(translations).length === 0 && warnings.length > 0) {
    throw new Error(warnings[0]!.replace(/^[^:]+:\s*/, ""));
  }

  return { translations, warnings };
}
