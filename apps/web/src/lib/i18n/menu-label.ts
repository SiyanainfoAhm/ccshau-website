/**
 * Display helpers for public English menu labels and page titles.
 * Hindi is left unchanged (use only when lang === "en").
 */

const TITLE_SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "nor",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "vs",
  "vs.",
]);

/** Top-level nav: HOME, ADMINISTRATION, … */
export function toUpperMenuLabel(input: string): string {
  return String(input ?? "").toLocaleUpperCase("en-IN");
}

function titleCaseSegment(segment: string, forceCapitalize: boolean): string {
  const match = segment.match(/^(.*?)([A-Za-z][A-Za-z']*)(.*)$/);
  if (!match) return segment;
  const [, lead, word, trail] = match;
  const lower = word.toLocaleLowerCase("en-IN");
  if (TITLE_SMALL_WORDS.has(lower) && !forceCapitalize) {
    return `${lead}${lower}${trail}`;
  }
  const isAllCaps = word === word.toLocaleUpperCase("en-IN");
  if (isAllCaps && word.length <= 5) {
    return `${lead}${word}${trail}`;
  }
  const body = isAllCaps ? lower : word;
  return `${lead}${body.charAt(0).toLocaleUpperCase("en-IN")}${body.slice(1)}${trail}`;
}

/**
 * Submenus / page titles: "Directorate Of Research" → "Directorate of Research".
 * Small words (of, the, and, …) stay lowercase unless they are the first or last word.
 * Short all-caps tokens (CCS, HAU, NIRF) are kept; longer shouted words are title-cased.
 */
export function toTitleMenuLabel(input: string): string {
  const text = String(input ?? "");
  return text.replace(/[^\s]+/g, (word, offset: number) => {
    const isFirst = text.slice(0, offset).trim().length === 0;
    const isLast = text.slice(offset + word.length).trim().length === 0;
    const parts = word.split(/([-/])/);
    const letterParts = parts.filter((part) => part !== "-" && part !== "/");
    let letterIndex = 0;
    return parts
      .map((part) => {
        if (part === "-" || part === "/") return part;
        const forceCapitalize =
          (isFirst && letterIndex === 0) || (isLast && letterIndex === letterParts.length - 1);
        letterIndex += 1;
        return titleCaseSegment(part, forceCapitalize);
      })
      .join("");
  });
}

export function formatMenuLabel(
  input: string,
  lang: string,
  style: "upper" | "title",
): string {
  if (lang === "hi") return input;
  return style === "upper" ? toUpperMenuLabel(input) : toTitleMenuLabel(input);
}
