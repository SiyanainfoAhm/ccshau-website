"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { useLanguage } from "@/components/design/shared/language-context";
import type { PublicPgStudiesHub } from "@/lib/data/public-types";
import { getPgStudiesHubPath, getPgStudiesSectionPath } from "@/lib/pages/routes";

function parsePgStudiesNavState(pathname: string) {
  const base = getPgStudiesHubPath();
  const contactPath = getPgStudiesSectionPath("contact");

  if (pathname === contactPath) {
    return { isHomePage: false, isContactPage: true, activeSection: null as string | null };
  }

  if (pathname === base) {
    return { isHomePage: true, isContactPage: false, activeSection: null };
  }

  if (!pathname.startsWith(`${base}/`)) {
    return { isHomePage: false, isContactPage: false, activeSection: null };
  }

  const section = pathname.slice(base.length + 1).split("/").filter(Boolean)[0] ?? null;
  return { isHomePage: false, isContactPage: false, activeSection: section };
}

function navLinkClass(active: boolean, isOpen: boolean, lang: string) {
  return [
    "ccshau-main-nav-link",
    isOpen && !active ? "ccshau-main-nav-link--open" : "",
    active ? "ccshau-main-nav-link--active" : "",
    lang === "hi" ? "font-hindi normal-case" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function PgStudiesNavigation({ hub }: { hub: PublicPgStudiesHub }) {
  const { lang, t } = useLanguage();
  const pathname = usePathname();
  const { isHomePage, isContactPage, activeSection } = parsePgStudiesNavState(pathname);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const gallerySection = hub.topSections.find((section) => section.urlSegment === "gallery");
  // Hub home highlights only "Home" — not also "Post Graduate Studies" (avoids double-active).
  const dropdownActive = hub.dropdownSections.some(
    (section) => section.urlSegment === activeSection,
  );

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="ccshau-main-nav-bar">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2 lg:hidden">
        <p className="text-xs font-medium text-emerald-100/90">
          {t(hub.titleEn, hub.titleHi ?? hub.titleEn)}
        </p>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
        >
          {t("PG Studies Menu", "स्नातकोत्तर मेनू")}
          <ChevronDown className={`h-4 w-4 transition ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      <nav
        aria-label="Post Graduate Studies navigation"
        className={`relative ${mobileOpen ? "block" : "hidden"} lg:block`}
      >
        <ul className="ccshau-main-nav-list mx-auto hidden max-w-7xl items-center justify-center gap-0 px-4 lg:flex">
          <li className="relative flex items-center">
            <Link
              href={getPgStudiesHubPath()}
              className={navLinkClass(isHomePage, false, lang)}
              onClick={closeMobile}
            >
              {t("Home", "होम")}
            </Link>
          </li>

          <li
            className="relative flex items-center"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <span className="ccshau-main-nav-separator" aria-hidden />
            <button
              type="button"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              onClick={() => setDropdownOpen((open) => !open)}
              className={navLinkClass(dropdownActive, dropdownOpen, lang)}
            >
              <span>{t("Post Graduate Studies", "स्नातकोत्तर अध्ययन")}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 opacity-70 transition ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            <ul
              className={`overflow-hidden rounded-lg border border-emerald-200 bg-white py-1 shadow-xl transition ${
                dropdownOpen ? "mt-1 block" : "hidden"
              } ml-3 lg:absolute lg:left-0 lg:top-full lg:z-50 lg:ml-0 lg:mt-0 lg:block lg:min-w-[280px] lg:pt-1 ${
                dropdownOpen ? "lg:visible lg:opacity-100" : "lg:invisible lg:opacity-0"
              }`}
            >
              {hub.dropdownSections.map((section) => {
                const href = getPgStudiesSectionPath(section.urlSegment);
                const isActive = activeSection === section.urlSegment;
                return (
                  <li key={section.slug}>
                    <Link
                      href={href}
                      onClick={() => {
                        setDropdownOpen(false);
                        closeMobile();
                      }}
                      className={`block px-4 py-2.5 text-sm font-semibold transition ${
                        isActive
                          ? "bg-emerald-50 text-emerald-900"
                          : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
                      } ${lang === "hi" ? "font-hindi" : ""}`}
                    >
                      {t(section.titleEn, section.titleHi ?? section.titleEn)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>

          {gallerySection && (
            <li className="relative flex items-center">
              <span className="ccshau-main-nav-separator" aria-hidden />
              <Link
                href={getPgStudiesSectionPath(gallerySection.urlSegment)}
                className={navLinkClass(activeSection === gallerySection.urlSegment, false, lang)}
                onClick={closeMobile}
              >
                {t(gallerySection.titleEn, gallerySection.titleHi ?? gallerySection.titleEn)}
              </Link>
            </li>
          )}

          <li className="relative flex items-center">
            <span className="ccshau-main-nav-separator" aria-hidden />
            <Link
              href={getPgStudiesSectionPath("contact")}
              className={navLinkClass(isContactPage, false, lang)}
              onClick={closeMobile}
            >
              {t("Contact us", "संपर्क करें")}
            </Link>
          </li>
        </ul>

        {mobileOpen && (
          <div className="border-t border-amber-400/20 lg:hidden">
            <ul>
              <li>
                <Link
                  href={getPgStudiesHubPath()}
                  onClick={closeMobile}
                  className={`flex w-full border-b border-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-amber-200 ${isHomePage ? "bg-white/10 text-amber-200" : ""} ${lang === "hi" ? "font-hindi" : ""}`}
                >
                  {t("Home", "होम")}
                </Link>
              </li>
              {hub.dropdownSections.map((section) => (
                <li key={`${section.slug}-mobile`}>
                  <Link
                    href={getPgStudiesSectionPath(section.urlSegment)}
                    onClick={closeMobile}
                    className={`flex w-full border-b border-white/5 px-4 py-2.5 pl-8 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-amber-200 ${activeSection === section.urlSegment ? "bg-white/10 text-amber-200" : ""} ${lang === "hi" ? "font-hindi" : ""}`}
                  >
                    {t(section.titleEn, section.titleHi ?? section.titleEn)}
                  </Link>
                </li>
              ))}
              {gallerySection && (
                <li>
                  <Link
                    href={getPgStudiesSectionPath(gallerySection.urlSegment)}
                    onClick={closeMobile}
                    className={`flex w-full border-b border-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-amber-200 ${activeSection === gallerySection.urlSegment ? "bg-white/10 text-amber-200" : ""} ${lang === "hi" ? "font-hindi" : ""}`}
                  >
                    {t(gallerySection.titleEn, gallerySection.titleHi ?? gallerySection.titleEn)}
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href={getPgStudiesSectionPath("contact")}
                  onClick={closeMobile}
                  className={`flex w-full border-b border-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-amber-200 ${isContactPage ? "bg-white/10 text-amber-200" : ""} ${lang === "hi" ? "font-hindi" : ""}`}
                >
                  {t("Contact us", "संपर्क करें")}
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </div>
  );
}
