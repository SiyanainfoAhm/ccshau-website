import { getGoogleTranslateApiKey } from "@/lib/secrets/google-translate-credentials";

const MYMEMORY_CHUNK_SIZE = 450;

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

async function translateWithMyMemory(text: string): Promise<string> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", "en|hi");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Translation service unavailable.");
  }

  const data = (await response.json()) as {
    responseStatus?: number;
    responseDetails?: string;
    responseData?: { translatedText?: string };
  };

  if (data.responseStatus !== 200) {
    throw new Error(data.responseDetails || "Translation failed.");
  }

  const translated = data.responseData?.translatedText?.trim();
  if (!translated) throw new Error("Translation returned empty text.");
  if (translated.includes("MYMEMORY WARNING")) {
    throw new Error(
      "Daily translation limit reached. Add GOOGLE_TRANSLATE_CREDENTIALS to Supabase Vault or set GOOGLE_TRANSLATE_CREDENTIALS in env.",
    );
  }

  return translated;
}

async function translatePlainEnToHi(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const google = await translateWithGoogle(trimmed, "text");
  if (google) return google;

  const chunks = chunkPlainText(trimmed, MYMEMORY_CHUNK_SIZE);
  const translated = await Promise.all(chunks.map((chunk) => translateWithMyMemory(chunk)));
  return translated.join(chunks.length > 1 && trimmed.includes("\n\n") ? "\n\n" : " ");
}

export async function translateEnToHi(text: string, format: "text" | "html" = "text"): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  if (format === "text") {
    return translatePlainEnToHi(trimmed);
  }

  const google = await translateWithGoogle(trimmed, "html");
  if (google) return google;

  const parts = trimmed.split(/(<[^>]+>)/g);
  const translated = await Promise.all(
    parts.map(async (part) => {
      if (/^<[^>]+>$/.test(part)) return part;
      if (!part.trim()) return part;
      return translatePlainEnToHi(part);
    }),
  );
  return translated.join("");
}

export async function translateFieldsEnToHi(
  fields: { key: string; text: string; format?: "text" | "html" }[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const field of fields) {
    if (!field.text.trim()) continue;
    result[field.key] = await translateEnToHi(field.text, field.format ?? "text");
  }

  return result;
}
