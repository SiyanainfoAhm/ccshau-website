/**
 * Display helpers for public English menu labels and page titles.
 * Hindi is left unchanged (use only when lang === "en").
 */

/** Top-level nav: HOME, ADMINISTRATION, … */
export function toUpperMenuLabel(input: string): string {
  return String(input ?? "").toLocaleUpperCase("en-IN");
}

/**
 * Submenus / page titles: "Board of management" → "Board Of Management".
 * Capitalizes the first letter of each word without lowercasing the rest
 * (keeps NIRF, Vice-Chancellor, etc.).
 */
export function toTitleMenuLabel(input: string): string {
  return String(input ?? "").replace(/(^|[\s(/]+|-)(\S)/g, (_, sep: string, ch: string) => {
    return `${sep}${ch.toLocaleUpperCase("en-IN")}`;
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
