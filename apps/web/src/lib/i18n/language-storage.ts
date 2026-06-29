export const LANG_STORAGE_KEY = "ccshau_lang";
export const LANG_COOKIE_NAME = "ccshau_lang";
export type Lang = "en" | "hi";

export function isLang(value: string | null | undefined): value is Lang {
  return value === "en" || value === "hi";
}

export function readStoredLang(): Lang | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function persistLang(lang: Lang): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.cookie = `${LANG_COOKIE_NAME}=${lang};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    // ignore storage errors
  }
}
