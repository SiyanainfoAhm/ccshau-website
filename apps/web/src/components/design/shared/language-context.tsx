"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  persistLang,
  readStoredLang,
  type Lang,
} from "@/lib/i18n/language-storage";

type LanguageContextValue = {
  lang: Lang;
  toggle: () => void;
  setLang: (lang: Lang) => void;
  t: (en: string, hi: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

let languageRevision = 0;
const languageSubscribers = new Set<() => void>();

function subscribeLanguage(onStoreChange: () => void) {
  languageSubscribers.add(onStoreChange);
  return () => {
    languageSubscribers.delete(onStoreChange);
  };
}

function bumpLanguageStore() {
  languageRevision += 1;
  languageSubscribers.forEach((listener) => listener());
}

function getLanguageSnapshot(): Lang {
  void languageRevision;
  return readStoredLang() ?? "en";
}

function getServerLanguageSnapshot(): Lang {
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const lang = useSyncExternalStore(
    subscribeLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot,
  );

  const setLang = useCallback(
    (next: Lang) => {
      persistLang(next);
      bumpLanguageStore();
      router.refresh();
    },
    [router],
  );

  const toggle = useCallback(() => {
    const next = lang === "en" ? "hi" : "en";
    persistLang(next);
    bumpLanguageStore();
    router.refresh();
  }, [lang, router]);

  const t = useCallback(
    (en: string, hi: string) => (lang === "hi" ? hi : en),
    [lang],
  );

  useEffect(() => {
    document.documentElement.lang = lang === "hi" ? "hi" : "en";
  }, [lang]);

  const value = useMemo(
    () => ({ lang, toggle, setLang, t }),
    [lang, toggle, setLang, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      <div lang={lang}>{children}</div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
