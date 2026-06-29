"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>("en");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredLang();
    if (stored) setLangState(stored);
    setHydrated(true);
  }, []);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      persistLang(next);
      router.refresh();
    },
    [router],
  );

  const toggle = useCallback(() => {
    setLangState((current) => {
      const next = current === "en" ? "hi" : "en";
      persistLang(next);
      return next;
    });
    router.refresh();
  }, [router]);

  const t = useCallback(
    (en: string, hi: string) => (lang === "hi" ? hi : en),
    [lang],
  );

  const value = useMemo(
    () => ({ lang, toggle, setLang, t }),
    [lang, toggle, setLang, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      <div lang={hydrated ? lang : "en"}>{children}</div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
