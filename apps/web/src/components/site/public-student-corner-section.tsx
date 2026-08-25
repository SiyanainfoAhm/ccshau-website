"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, GraduationCap, Search } from "lucide-react";

import { useLanguage } from "@/components/design/shared/language-context";
import type { PublicStudentCornerItem } from "@/lib/data/public-types";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import type { Lang } from "@/lib/i18n/language-storage";
import { typeSubsectionTitleClass } from "@/lib/design/public-page-classes";

const INITIAL_VISIBLE_COUNT = 9;
const SEARCH_THRESHOLD = 20;

function StudentCornerItemCard({
  item,
  lang,
  t,
}: {
  item: PublicStudentCornerItem;
  lang: Lang;
  t: (en: string, hi: string) => string;
}) {
  const label = pickBilingual(lang, item.titleEn, item.titleHi);
  const isExternal = item.href?.startsWith("http") ?? false;
  const inner = (
    <>
      {item.isNew && (
        <span className="shrink-0 rounded bg-emerald-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
          {t("New", "नया")}
        </span>
      )}
      <span
        className={`min-w-0 flex-1 font-semibold text-emerald-950 ${lang === "hi" ? "font-hindi" : ""}`}
      >
        {label}
      </span>
      {item.href && <ChevronRight className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />}
    </>
  );

  const linkClassName =
    "flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-white px-4 py-3.5 text-sm shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/60 hover:shadow-md";

  if (item.href) {
    return (
      <Link
        href={item.href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={linkClassName}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-white px-4 py-3.5 text-sm shadow-sm">
      {inner}
    </div>
  );
}

export function PublicStudentCornerSection({ items }: { items: PublicStudentCornerItem[] }) {
  const { lang, t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const label = pickBilingual(lang, item.titleEn, item.titleHi).toLowerCase();
      return label.includes(query);
    });
  }, [items, lang, search]);

  if (items.length === 0) return null;

  const needsCollapse = items.length > INITIAL_VISIBLE_COUNT;
  const showSearch = expanded && items.length >= SEARCH_THRESHOLD;
  const visibleItems = expanded
    ? filteredItems
    : filteredItems.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = Math.max(items.length - INITIAL_VISIBLE_COUNT, 0);

  return (
    <section className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-sm">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2
                className={`${typeSubsectionTitleClass} text-emerald-950 ${lang === "hi" ? "font-hindi" : ""}`}
              >
                {t("Student Corner", "छात्र कोना")}
              </h2>
              {items.length > 1 && (
                <p className="text-xs text-emerald-800/70">
                  {t(`${items.length} resources`, `${items.length} संसाधन`)}
                </p>
              )}
            </div>
          </div>

          {showSearch && (
            <label className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700/60" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search student corner…", "छात्र कोना खोजें…")}
                className={`w-full rounded-lg border border-emerald-200 bg-white py-2 pl-9 pr-3 text-sm text-emerald-950 shadow-sm outline-none ring-emerald-500/30 placeholder:text-emerald-900/40 focus:border-emerald-400 focus:ring-2 ${lang === "hi" ? "font-hindi" : ""}`}
              />
            </label>
          )}
        </div>

        <div
          className={
            expanded && needsCollapse
              ? "max-h-[min(70vh,28rem)] overflow-y-auto rounded-xl border border-emerald-100/80 bg-white/40 p-1 pr-2"
              : undefined
          }
        >
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => (
              <li key={item.id}>
                <StudentCornerItemCard item={item} lang={lang} t={t} />
              </li>
            ))}
          </ul>

          {expanded && filteredItems.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              {t("No items match your search.", "आपकी खोज से कोई आइटम मेल नहीं खाता।")}
            </p>
          )}
        </div>

        {needsCollapse && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setExpanded((open) => !open);
                if (expanded) setSearch("");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-2 text-sm font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" aria-hidden />
                  {t("Show less", "कम दिखाएं")}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" aria-hidden />
                  {t(`View all ${items.length} items`, `सभी ${items.length} आइटम देखें`)}
                  <span className="text-emerald-700/70">
                    ({t(`${hiddenCount} more`, `${hiddenCount} और`)})
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
