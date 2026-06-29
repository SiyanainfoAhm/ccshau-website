import type { Lang } from "@/lib/i18n/language-storage";

/** Pick EN or HI with fallback when the preferred locale is empty. */
export function pickBilingual(
  lang: Lang,
  en: string | null | undefined,
  hi: string | null | undefined,
): string {
  if (lang === "hi") return (hi?.trim() || en?.trim() || "");
  return (en?.trim() || hi?.trim() || "");
}
