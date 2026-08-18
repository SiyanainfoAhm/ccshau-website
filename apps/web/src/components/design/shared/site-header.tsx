"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Globe, Menu, Search, Sparkles, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { AccessibilityToolbar } from "@/components/design/shared/accessibility-toolbar";
import { useEscapeKey } from "@/lib/a11y/use-escape-key";
import { CollegeNavigation } from "@/components/design/shared/college-navigation";
import { PgStudiesNavigation } from "@/components/design/shared/pg-studies-navigation";
import { MainNavigation } from "@/components/design/shared/main-navigation";
import { useLanguage } from "@/components/design/shared/language-context";
import { usePublicSiteChrome } from "@/components/site/public-site-context";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import type { PublicCollegePage, PublicNavItem, PublicPgStudiesHub } from "@/lib/data/public-types";
import { navItems as mockNavItems, university } from "@/lib/mock/site-content";

type HeaderVariant = "heritage" | "future" | "ministry";

const variantStyles: Record<HeaderVariant, string> = {
  heritage:
    "bg-white/95 text-slate-800 border-b-4 border-transparent shadow-md backdrop-blur-sm [border-image:linear-gradient(90deg,#fda4af,#fcd34d,#86efac,#7dd3fc,#c4b5fd)_1]",
  future:
    "bg-gradient-to-r from-ccshau-chrome-900 via-ccshau-chrome-700 to-ccshau-chrome-800 text-white border-b border-white/10",
  ministry: "bg-white text-slate-900 border-b-4 border-[#0c3b6e] shadow-sm",
};

export function SiteHeader({
  variant = "future",
  homeHref = SELECTED_LAYOUT.homePath,
  navItems: navItemsProp,
  showMainNav,
  college,
  pgStudiesHub,
  pageLayoutConfig,
}: {
  variant?: HeaderVariant;
  homeHref?: string;
  navItems?: PublicNavItem[];
  /** When omitted, main nav is hidden on /college/* routes. */
  showMainNav?: boolean;
  /** When set, renders college navigation instead of the main site menu. */
  college?: PublicCollegePage;
  /** When set, renders PG Studies microsite navigation. */
  pgStudiesHub?: PublicPgStudiesHub;
  /** Nav toggles for the current page (overrides college root when set). */
  pageLayoutConfig?: { collegeTopMenu?: boolean };
}) {
  const { lang, toggle, t } = useLanguage();
  const pathname = usePathname();
  const isCollegeRoute = pathname.startsWith("/college/");
  const isPgStudiesRoute = pathname.startsWith("/pages/pg-studies");
  const isCollegeContext = Boolean(college) || isCollegeRoute;
  const isPgStudiesContext = Boolean(pgStudiesHub) || isPgStudiesRoute;
  // Keep college chrome on section/subsection pages (gallery/dept use minimal content
  // layout but must not fall back to the university main menu).
  const collegeTopMenu = college
    ? (college.layoutConfig?.collegeTopMenu ?? true)
    : (pageLayoutConfig?.collegeTopMenu ?? true);
  const pgStudiesTopMenu = pgStudiesHub
    ? (pgStudiesHub.layoutConfig?.collegeTopMenu ?? true)
    : (pageLayoutConfig?.collegeTopMenu ?? true);
  const shouldShowMainNav =
    showMainNav ??
    ((!isCollegeContext && !isPgStudiesContext) ||
      (isCollegeContext && !collegeTopMenu) ||
      (isPgStudiesContext && !pgStudiesTopMenu));
  const shouldShowCollegeNav = Boolean(college) && collegeTopMenu;
  const shouldShowPgStudiesNav = Boolean(pgStudiesHub) && pgStudiesTopMenu && !college;
  const chrome = usePublicSiteChrome();
  const navItems = navItemsProp ?? chrome?.headerNav ?? mockNavItems.map((item) => ({
    labelEn: item.labelEn,
    labelHi: item.labelHi,
    href: item.href,
    children: item.children?.map((child) => ({
      labelEn: child,
      labelHi: null,
      href: "#",
    })),
  }));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const isLight = variant === "ministry" || variant === "heritage";
  const isHeritage = variant === "heritage";
  const isMinistry = variant === "ministry";

  const logoHref =
    isCollegeContext || isPgStudiesContext ? "/" : homeHref;

  const resolveHref = (href: string) => {
    if (href.includes("/design/option-")) {
      return href.replace(/\/design\/option-[abc]/, homeHref.replace(/\/$/, ""));
    }
    return href;
  };

  useEscapeKey(mobileOpen, () => setMobileOpen(false));

  useEffect(() => {
    if (!mobileOpen) return;
    const firstLink = document.querySelector<HTMLElement>("[data-mobile-nav] a, [data-mobile-nav] button");
    firstLink?.focus();
  }, [mobileOpen]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length < 2) return;
    router.push(`${SELECTED_LAYOUT.routes.search}?q=${encodeURIComponent(q)}`);
    setMobileOpen(false);
  }

  return (
    <header className={variantStyles[variant]}>
      {isMinistry && <div className="goi-tricolor-bar" />}
      {isHeritage && <div className="heritage-rainbow-bar" />}
      <a href="#main-content" className="skip-link">
        {t("Skip to content", "सामग्री पर जाएं")}
      </a>

      {/* Top bar */}
      <div
        className={`border-b text-xs ${isMinistry ? "border-slate-200 bg-slate-50" : isHeritage ? "border-white/50 bg-gradient-to-r from-rose-50 via-amber-50 to-sky-50" : isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-black/15"}`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <p className={isHeritage ? "text-slate-600" : isLight ? "text-slate-600" : "text-emerald-100"}>
            {t(university.taglineEn, university.taglineHi)}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              aria-label={lang === "en" ? t("Switch to Hindi", "हिंदी में बदलें") : t("Switch to English", "अंग्रेज़ी में बदलें")}
              className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium transition ${isHeritage ? "bg-white/80 text-violet-700 shadow-sm ring-1 ring-violet-100 hover:bg-violet-50" : isMinistry ? "bg-sky-50 text-[#0c3b6e] hover:bg-sky-100" : isLight ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-white/10 hover:bg-white/20"}`}
            >
              <Globe className="h-3.5 w-3.5" />
              {lang === "en" ? "हिंदी" : "English"}
            </button>
            {(!isLight || isHeritage || isMinistry) && (
              <AccessibilityToolbar variant={isLight ? "on-light" : "on-dark"} />
            )}
            <Link
              href="/faculty-login"
              className={`hidden sm:inline ${isHeritage ? "text-[#9e4a5a] hover:underline" : isMinistry ? "text-[#0c3b6e] hover:underline" : isLight ? "text-emerald-700 hover:underline" : "text-amber-200 hover:text-white"}`}
            >
              {t("Faculty Login", "संकाय लॉगिन")}
            </Link>
            {!(isCollegeContext || isPgStudiesContext) && (
              <Link
                href="/design"
                className={`hidden sm:inline ${isHeritage ? "text-[#9e4a5a] hover:underline" : isMinistry ? "text-[#0c3b6e] hover:underline" : isLight ? "text-emerald-700 hover:underline" : "text-amber-200 hover:text-white"}`}
              >
                {t("Design Gallery", "डिज़ाइन गैलरी")}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3.5 sm:gap-5 sm:py-5">
        <Link href={logoHref} className="group flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div
            className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-black shadow-lg transition group-hover:scale-105 sm:h-16 sm:w-16 md:h-[4.6rem] md:w-[4.6rem] ${isHeritage ? "ring-2 ring-rose-200" : isMinistry ? "ring-2 ring-[#0c3b6e]/30" : isLight ? "ring-2 ring-emerald-200" : "ring-2 ring-amber-400/50"}`}
          >
            <Image
              src="/images/ccshau-logo.png"
              alt={t(
                "Chaudhary Charan Singh Haryana Agricultural University logo",
                "चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय लोगो",
              )}
              fill
              className="object-cover"
              sizes="74px"
              priority
            />
          </div>
          <div className="min-w-0">
            <p
              className={`font-display text-lg font-bold leading-tight sm:text-xl md:text-2xl ${isHeritage ? "text-slate-800" : isMinistry ? "text-[#0c3b6e]" : isLight ? "text-emerald-900" : "text-white"}`}
            >
              {t(university.shortName, university.shortName)}
            </p>
            <p
              className={`font-hindi truncate text-xs leading-snug sm:text-sm ${isHeritage ? "text-slate-600" : isLight ? "text-slate-600" : "text-emerald-100/90"}`}
            >
              {t(university.nameEn, university.nameHi)}
            </p>
            <p
              className={`mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight sm:text-xs ${
                isHeritage
                  ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80"
                  : isMinistry
                    ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80"
                    : isLight
                      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
                      : "bg-white/10 text-amber-200 ring-1 ring-white/20"
              }`}
            >
              <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">
                {t("NAEAB A+ Accredited University", "एनएईएबी ए+ मान्यता प्राप्त विश्वविद्यालय")}
              </span>
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <form onSubmit={handleSearchSubmit} className="hidden lg:block">
            <label className="sr-only" htmlFor="site-header-search">
              {t("Search university website", "विश्वविद्यालय वेबसाइट खोजें")}
            </label>
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 shadow-sm transition focus-within:ring-2 ${
                isHeritage
                  ? "bg-white/95 ring-1 ring-sky-100 focus-within:ring-rose-300"
                  : isLight
                    ? "bg-slate-100 ring-1 ring-slate-200 focus-within:ring-emerald-400"
                    : "bg-white/12 ring-1 ring-white/15 focus-within:ring-amber-300/70"
              }`}
            >
              <Search
                className={`h-4 w-4 shrink-0 ${isHeritage ? "text-rose-400" : isLight ? "text-slate-500" : "text-amber-200"}`}
                aria-hidden
              />
              <input
                id="site-header-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("Search university...", "विश्वविद्यालय खोजें...")}
                className={`w-40 bg-transparent text-sm outline-none xl:w-52 ${
                  isHeritage
                    ? "text-slate-700 placeholder:text-slate-400"
                    : isLight
                      ? "text-slate-800 placeholder:text-slate-400"
                      : "text-white placeholder:text-emerald-100/60"
                }`}
              />
              <button
                type="submit"
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  isHeritage
                    ? "bg-rose-100 text-rose-800 hover:bg-rose-200"
                    : isLight
                      ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                      : "bg-amber-400/90 text-emerald-950 hover:bg-amber-300"
                }`}
              >
                {t("Go", "जाएँ")}
              </button>
            </div>
          </form>

          <figure
            className={`relative h-[4.6rem] w-16 shrink-0 overflow-hidden rounded-xl shadow-lg sm:h-[5.5rem] sm:w-[4.75rem] ${
              isHeritage
                ? "ring-2 ring-rose-200"
                : isMinistry
                  ? "ring-2 ring-[#0c3b6e]/25"
                  : isLight
                    ? "ring-2 ring-emerald-200"
                    : "ring-2 ring-amber-300/55"
            }`}
          >
            <Image
              src="/images/chaudhary-charan-singh.png"
              alt={t(
                "Chaudhary Charan Singh, former Prime Minister of India",
                "चौधरी चरण सिंह, भारत के पूर्व प्रधान मंत्री",
              )}
              fill
              className="object-cover object-[50%_12%]"
              sizes="76px"
              priority
            />
          </figure>

          {shouldShowMainNav && (
            <button
              ref={mobileMenuButtonRef}
              type="button"
              className={`rounded-xl p-2 lg:hidden ${isLight ? "bg-slate-100" : "bg-white/10"}`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-main-navigation"
              aria-label={mobileOpen ? t("Close menu", "मेनू बंद करें") : t("Open menu", "मेनू खोलें")}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          )}
        </div>
      </div>

      {shouldShowMainNav && (
      <div
        id="mobile-main-navigation"
        className={`${mobileOpen ? "block" : "hidden"} lg:block ${
          isMinistry
            ? "border-t border-slate-200 bg-[#0c3b6e]"
            : isHeritage
              ? "border-t border-rose-100/80 bg-gradient-to-r from-rose-50/80 via-white to-sky-50/80"
              : isLight
                ? "border-t border-slate-200 bg-white"
                : "ccshau-main-nav-bar"
        }`}
      >
        <form onSubmit={handleSearchSubmit} className="border-b border-white/10 p-4 lg:hidden">
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
            <Search className="h-4 w-4 text-emerald-200" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Search...", "खोजें...")}
              aria-label={t("Search", "खोज")}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-emerald-200/70"
            />
          </div>
        </form>
        <MainNavigation
          items={navItems}
          resolveHref={resolveHref}
          tone={isMinistry ? "ministry" : isHeritage ? "heritage" : isLight ? "light" : "future"}
          mobileOpen={mobileOpen}
          onMobileClose={() => {
            setMobileOpen(false);
            mobileMenuButtonRef.current?.focus();
          }}
        />
      </div>
      )}

      {shouldShowCollegeNav && college && <CollegeNavigation college={college} />}
      {shouldShowPgStudiesNav && pgStudiesHub && <PgStudiesNavigation hub={pgStudiesHub} />}
    </header>
  );
}
