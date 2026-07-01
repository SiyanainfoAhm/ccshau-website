"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Globe, Menu, Search, X } from "lucide-react";
import { useState } from "react";

import { AccessibilityToolbar } from "@/components/design/shared/accessibility-toolbar";
import { CollegeNavigation } from "@/components/design/shared/college-navigation";
import { MainNavigation } from "@/components/design/shared/main-navigation";
import { useLanguage } from "@/components/design/shared/language-context";
import { usePublicSiteChrome } from "@/components/site/public-site-context";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import type { PublicCollegePage, PublicNavItem } from "@/lib/data/public-types";
import { navItems as mockNavItems, university } from "@/lib/mock/site-content";

type HeaderVariant = "heritage" | "future" | "ministry";

const variantStyles: Record<HeaderVariant, string> = {
  heritage:
    "bg-white/95 text-slate-800 border-b-4 border-transparent shadow-md backdrop-blur-sm [border-image:linear-gradient(90deg,#fda4af,#fcd34d,#86efac,#7dd3fc,#c4b5fd)_1]",
  future:
    "bg-gradient-to-r from-[#0b3d2e] via-[#146c43] to-[#0d4a38] text-white border-b border-white/10",
  ministry: "bg-white text-slate-900 border-b-4 border-[#146c43] shadow-sm",
};

export function SiteHeader({
  variant = "future",
  homeHref = SELECTED_LAYOUT.homePath,
  navItems: navItemsProp,
  showMainNav,
  college,
}: {
  variant?: HeaderVariant;
  homeHref?: string;
  navItems?: PublicNavItem[];
  /** When omitted, main nav is hidden on /college/* routes. */
  showMainNav?: boolean;
  /** When set, renders college navigation instead of the main site menu. */
  college?: PublicCollegePage;
}) {
  const { lang, toggle, t } = useLanguage();
  const pathname = usePathname();
  const isCollegeRoute = pathname.startsWith("/college/");
  const isCollegeContext = Boolean(college) || isCollegeRoute;
  const shouldShowMainNav = showMainNav ?? !isCollegeContext;
  const shouldShowCollegeNav = Boolean(college);
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
  const router = useRouter();
  const isLight = variant === "ministry" || variant === "heritage";
  const isHeritage = variant === "heritage";
  const isMinistry = variant === "ministry";

  const resolveHref = (href: string) => {
    if (!isMinistry || !href.includes("/design/option-")) return href;
    return href.replace(/\/design\/option-[abc]/, homeHref.replace(/\/$/, ""));
  };

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
        Skip to content
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
              className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium transition ${isHeritage ? "bg-white/80 text-violet-700 shadow-sm ring-1 ring-violet-100 hover:bg-violet-50" : isLight ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-white/10 hover:bg-white/20"}`}
            >
              <Globe className="h-3.5 w-3.5" />
              {lang === "en" ? "हिंदी" : "English"}
            </button>
            {(!isLight || isHeritage || isMinistry) && <AccessibilityToolbar />}
            {isCollegeContext ? (
              <Link
                href="/"
                className={`hidden sm:inline ${isHeritage ? "text-[#9e4a5a] hover:underline" : isLight ? "text-emerald-700 hover:underline" : "text-amber-200 hover:text-white"}`}
              >
                {t("University Home", "विश्वविद्यालय होम")}
              </Link>
            ) : (
              <Link
                href="/design"
                className={`hidden sm:inline ${isHeritage ? "text-[#9e4a5a] hover:underline" : isLight ? "text-emerald-700 hover:underline" : "text-amber-200 hover:text-white"}`}
              >
                {t("Design Gallery", "डिज़ाइन गैलरी")}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <Link href={homeHref} className="group flex min-w-0 items-center gap-3">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-bold shadow-lg transition group-hover:scale-105 ${isHeritage ? "bg-gradient-to-br from-amber-300 via-rose-300 to-violet-300 text-white" : isLight ? "gradient-gold text-emerald-950" : "bg-white/15 text-amber-300 ring-2 ring-amber-400/40"}`}
          >
            HAU
          </div>
          <div className="min-w-0">
            <p
              className={`font-display text-lg font-bold leading-tight md:text-xl ${isHeritage ? "text-slate-800" : isLight ? "text-emerald-900" : "text-white"}`}
            >
              {t(university.shortName, university.shortName)}
            </p>
            <p
              className={`font-hindi truncate text-xs md:text-sm ${isHeritage ? "text-slate-600" : isLight ? "text-slate-600" : "text-emerald-100"}`}
            >
              {t(university.nameEn, university.nameHi)}
            </p>
          </div>
        </Link>

        <form onSubmit={handleSearchSubmit} className="hidden items-center gap-2 lg:flex">
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2 ${isHeritage ? "bg-white/90 ring-1 ring-sky-100 shadow-sm" : isLight ? "bg-slate-100" : "bg-white/10"}`}
          >
            <Search className={`h-4 w-4 ${isHeritage ? "text-rose-400" : isLight ? "text-slate-500" : "text-emerald-200"}`} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Search university...", "विश्वविद्यालय खोजें...")}
              className={`w-44 bg-transparent text-sm outline-none md:w-56 ${isHeritage ? "placeholder:text-slate-400 text-slate-700" : isLight ? "placeholder:text-slate-400" : "placeholder:text-emerald-200/70"}`}
            />
          </div>
        </form>

        {shouldShowMainNav && (
          <button
            type="button"
            className={`rounded-xl p-2 lg:hidden ${isLight ? "bg-slate-100" : "bg-white/10"}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        )}
      </div>

      {shouldShowMainNav && (
      <div
        className={`${mobileOpen ? "block" : "hidden"} lg:block ${
          isMinistry
            ? "border-t border-slate-200 bg-[#146c43]"
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
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-emerald-200/70"
            />
          </div>
        </form>
        <MainNavigation
          items={navItems}
          resolveHref={resolveHref}
          tone={isMinistry ? "ministry" : isHeritage ? "heritage" : isLight ? "light" : "future"}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>
      )}

      {shouldShowCollegeNav && college && <CollegeNavigation college={college} />}
    </header>
  );
}
