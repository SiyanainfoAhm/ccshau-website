export const A11Y_STORAGE_KEY = "ccshau_a11y";

export type ThemeMode = "light" | "dark";

export interface AccessibilityPreferences {
  theme: ThemeMode;
  fontScale: number;
  highContrast: boolean;
}

export const FONT_SCALE_MIN = 0.9;
export const FONT_SCALE_MAX = 1.4;
export const FONT_SCALE_STEP = 0.1;

export const DEFAULT_A11Y_PREFERENCES: AccessibilityPreferences = {
  theme: "light",
  fontScale: 1,
  highContrast: false,
};

export function clampFontScale(scale: number): number {
  return Math.min(
    FONT_SCALE_MAX,
    Math.max(FONT_SCALE_MIN, Math.round(scale * 10) / 10),
  );
}

export function readAccessibilityPreferences(): AccessibilityPreferences {
  if (typeof window === "undefined") return DEFAULT_A11Y_PREFERENCES;

  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) return DEFAULT_A11Y_PREFERENCES;

    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>;
    return {
      theme: parsed.theme === "dark" ? "dark" : "light",
      fontScale: clampFontScale(
        typeof parsed.fontScale === "number" ? parsed.fontScale : DEFAULT_A11Y_PREFERENCES.fontScale,
      ),
      highContrast: Boolean(parsed.highContrast),
    };
  } catch {
    return DEFAULT_A11Y_PREFERENCES;
  }
}

export function persistAccessibilityPreferences(prefs: AccessibilityPreferences): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

export function applyAccessibilityPreferences(prefs: AccessibilityPreferences): void {
  const root = document.documentElement;
  root.classList.toggle("dark", prefs.theme === "dark");
  root.style.setProperty("--font-scale", String(prefs.fontScale));
  document.body.classList.toggle("high-contrast", prefs.highContrast);
}

export function resetAccessibilityPreferences(): AccessibilityPreferences {
  cachedSnapshot = { ...DEFAULT_A11Y_PREFERENCES };
  applyAccessibilityPreferences(cachedSnapshot);
  persistAccessibilityPreferences(cachedSnapshot);
  notifyAccessibilityStore();
  return cachedSnapshot;
}

let accessibilityRevision = 0;
const accessibilitySubscribers = new Set<() => void>();
let cachedSnapshot: AccessibilityPreferences = DEFAULT_A11Y_PREFERENCES;

function preferencesEqual(a: AccessibilityPreferences, b: AccessibilityPreferences): boolean {
  return a.theme === b.theme && a.fontScale === b.fontScale && a.highContrast === b.highContrast;
}

function refreshCachedSnapshot(): AccessibilityPreferences {
  const next = readAccessibilityPreferences();
  if (!preferencesEqual(cachedSnapshot, next)) {
    cachedSnapshot = next;
  }
  return cachedSnapshot;
}

export function subscribeAccessibility(onStoreChange: () => void): () => void {
  accessibilitySubscribers.add(onStoreChange);
  return () => {
    accessibilitySubscribers.delete(onStoreChange);
  };
}

export function notifyAccessibilityStore(): void {
  accessibilityRevision += 1;
  accessibilitySubscribers.forEach((listener) => listener());
}

export function getAccessibilitySnapshot(): AccessibilityPreferences {
  void accessibilityRevision;
  return refreshCachedSnapshot();
}

export function getServerAccessibilitySnapshot(): AccessibilityPreferences {
  return DEFAULT_A11Y_PREFERENCES;
}

export function updateAccessibilityPreferences(
  updater: (current: AccessibilityPreferences) => AccessibilityPreferences,
): AccessibilityPreferences {
  const next = updater(refreshCachedSnapshot());
  cachedSnapshot = next;
  applyAccessibilityPreferences(next);
  persistAccessibilityPreferences(next);
  notifyAccessibilityStore();
  return next;
}

/** Inline bootstrap to apply stored prefs before paint (root layout). */
export const A11Y_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(A11Y_STORAGE_KEY)},r=localStorage.getItem(k);if(!r)return;var p=JSON.parse(r),d=document.documentElement,b=document.body;if(p.theme==="dark")d.classList.add("dark");if(p.highContrast)b.classList.add("high-contrast");if(typeof p.fontScale==="number"){var s=Math.min(${FONT_SCALE_MAX},Math.max(${FONT_SCALE_MIN},p.fontScale));d.style.setProperty("--font-scale",String(s));}}catch(e){}})();`;
