"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { useLanguage } from "@/components/design/shared/language-context";
import { useEscapeKey } from "@/lib/a11y/use-escape-key";
import { compareBySortOrderThenTitle, isCollegeDepartmentMenuSubsection } from "@/lib/pages/college-nav";
import {
  getCollegeContactPath,
  getCollegePublicHomePath,
  getCollegeSectionPath,
  getCollegeSubsectionPath,
} from "@/lib/pages/routes";
import { formatMenuLabel } from "@/lib/i18n/menu-label";
import type { PublicCollegePage, PublicCollegeSection } from "@/lib/data/public-types";

type CollegeMiddleNavItem =
  | { type: "section"; section: PublicCollegeSection }
  | { type: "external"; labelEn: string; labelHi: string; href: string }
  | { type: "faculty"; labelEn: string; labelHi: string; href: string };

function parseCollegeNavState(pathname: string, collegeSlug: string) {
  const base = `/college/${collegeSlug}`;
  const homePath = getCollegePublicHomePath(collegeSlug);
  const contactPath = getCollegeContactPath(collegeSlug);

  if (pathname === contactPath) {
    return {
      isHomePage: false,
      isContactPage: true,
      activeSectionSlug: null as string | null,
      activeSubsectionSlug: null as string | null,
    };
  }

  if (pathname === homePath || pathname === base) {
    return {
      isHomePage: true,
      isContactPage: false,
      activeSectionSlug: null as string | null,
      activeSubsectionSlug: null as string | null,
    };
  }

  if (!pathname.startsWith(`${base}/`)) {
    return {
      isHomePage: false,
      isContactPage: false,
      activeSectionSlug: null,
      activeSubsectionSlug: null,
    };
  }

  const parts = pathname.slice(base.length + 1).split("/").filter(Boolean);
  return {
    isHomePage: false,
    isContactPage: false,
    activeSectionSlug: parts[0] ?? null,
    activeSubsectionSlug: parts[1] ?? null,
  };
}

function collegeNavLinkClass(active: boolean, isOpen: boolean, lang: string) {
  return [
    "ccshau-main-nav-link",
    isOpen && !active ? "ccshau-main-nav-link--open" : "",
    active ? "ccshau-main-nav-link--active" : "",
    lang === "hi" ? "font-hindi normal-case" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function CollegeNavigation({ college }: { college: PublicCollegePage }) {
  const { lang, t } = useLanguage();
  const pathname = usePathname();
  const homePath = getCollegePublicHomePath(college.collegeSlug);
  const [facultyTab, setFacultyTab] = useState(false);
  useEffect(() => {
    setFacultyTab(new URLSearchParams(window.location.search).get("tab") === "faculty");
  }, [pathname]);
  const { isHomePage, isContactPage, activeSectionSlug, activeSubsectionSlug } = parseCollegeNavState(
    pathname,
    college.collegeSlug,
  );
  const [openSectionSlug, setOpenSectionSlug] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEscapeKey(openSectionSlug != null || mobileOpen, () => {
    setOpenSectionSlug(null);
    setMobileOpen(false);
  });

  const reservedNavSlugs = new Set(["home", "contact", "contact-us"]);
  const sectionLinks: CollegeMiddleNavItem[] = college.sections
    .filter((section) => !reservedNavSlugs.has(section.slug))
    .map((section) => ({ type: "section" as const, section }));
  const opacLink: CollegeMiddleNavItem = {
    type: "external",
    labelEn: "Online Catalogue",
    labelHi: "ऑनलाइन कैटलॉग",
    href: "https://haulibopac.ltsinformatics.com",
  };
  const facultyLink: CollegeMiddleNavItem = {
    type: "faculty",
    labelEn: "Faculty",
    labelHi: "संकाय",
    href: `${homePath}?tab=faculty`,
  };
  const middleLinks: CollegeMiddleNavItem[] =
    college.collegeSlug === "nehru-library"
      ? (() => {
          const digitalIdx = sectionLinks.findIndex(
            (item) => item.type === "section" && item.section.slug === "digital-library",
          );
          const next = [...sectionLinks];
          if (digitalIdx >= 0) next.splice(digitalIdx, 0, opacLink);
          else next.push(opacLink);
          next.push(facultyLink);
          return next;
        })()
      : sectionLinks;
  const links = [
    { type: "home" as const, labelEn: "Home", labelHi: "होम" },
    ...middleLinks,
    { type: "contact" as const, labelEn: "Contact Us", labelHi: "संपर्क करें" },
  ];

  return (
    <div className="ccshau-main-nav-bar">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2 lg:hidden">
        <p className="text-xs font-medium text-emerald-100/90">
          {formatMenuLabel(t(college.titleEn, college.titleHi ?? college.titleEn), lang, "title")}
        </p>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
        >
          {t("College Menu", "महाविद्यालय मेनू")}
          <ChevronDown className={`h-4 w-4 transition ${mobileOpen ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>

      <nav
        aria-label="College navigation"
        className={`relative ${mobileOpen ? "block" : "hidden"} lg:block`}
      >
        <ul className="ccshau-main-nav-list mx-auto hidden max-w-7xl items-center justify-center gap-0 px-4 lg:flex">
          {links.map((link, index) => {
            if (link.type === "home") {
              const isActive = isHomePage && !facultyTab;
              return (
                <li key="home" className="relative flex items-center">
                  {index > 0 && <span className="ccshau-main-nav-separator" aria-hidden />}
                  <Link
                    href={homePath}
                    className={collegeNavLinkClass(isActive, false, lang)}
                    onClick={() => setMobileOpen(false)}
                  >
                    {t(link.labelEn, link.labelHi)}
                  </Link>
                </li>
              );
            }

            if (link.type === "contact") {
              return (
                <li key="contact" className="relative flex items-center">
                  {index > 0 && <span className="ccshau-main-nav-separator" aria-hidden />}
                  <Link
                    href={getCollegeContactPath(college.collegeSlug)}
                    className={collegeNavLinkClass(isContactPage, false, lang)}
                    onClick={() => setMobileOpen(false)}
                  >
                    {formatMenuLabel(t(link.labelEn, link.labelHi), lang, "upper")}
                  </Link>
                </li>
              );
            }

            if (link.type === "external" || link.type === "faculty") {
              return (
                <li key={link.labelEn} className="relative flex items-center">
                  {index > 0 && <span className="ccshau-main-nav-separator" aria-hidden />}
                  <Link
                    href={link.href}
                    target={link.type === "external" ? "_blank" : undefined}
                    rel={link.type === "external" ? "noopener noreferrer" : undefined}
                    className={collegeNavLinkClass(link.type === "faculty" && isHomePage && facultyTab, false, lang)}
                    onClick={() => setMobileOpen(false)}
                  >
                    {t(link.labelEn, link.labelHi)}
                  </Link>
                </li>
              );
            }

            const { section } = link;
            const menuSubsections = section.subsections
              .filter(isCollegeDepartmentMenuSubsection)
              .slice()
              .sort(compareBySortOrderThenTitle);
            const hasSubsections = menuSubsections.length > 0;
            const isSectionActive = activeSectionSlug === section.slug;
            const isOpen = openSectionSlug === section.slug;

            if (hasSubsections) {
              return (
                <li
                  key={section.pageId}
                  className="relative flex items-center"
                  onMouseEnter={() => setOpenSectionSlug(section.slug)}
                  onMouseLeave={() => setOpenSectionSlug(null)}
                >
                  {index > 0 && <span className="ccshau-main-nav-separator" aria-hidden />}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() => setOpenSectionSlug(isOpen ? null : section.slug)}
                    className={collegeNavLinkClass(isSectionActive, isOpen, lang)}
                  >
                    <span>{t(section.titleEn, section.titleHi ?? section.titleEn)}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 opacity-70 transition ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                  </button>
                  <ul
                    className={`overflow-hidden rounded-lg border border-emerald-200 bg-white py-1 shadow-xl transition ${
                      isOpen ? "mt-1 block" : "hidden"
                    } ml-3 lg:absolute lg:left-0 lg:top-full lg:z-50 lg:ml-0 lg:mt-0 lg:block lg:min-w-[260px] lg:pt-1 ${
                      isOpen
                        ? "lg:visible lg:pointer-events-auto lg:opacity-100"
                        : "lg:invisible lg:pointer-events-none lg:opacity-0"
                    }`}
                  >
                    {menuSubsections.map((subsection) => {
                      const href = getCollegeSubsectionPath(
                        college.collegeSlug,
                        section.slug,
                        subsection.slug,
                      );
                      const isActive = activeSubsectionSlug === subsection.slug;

                      return (
                        <li key={subsection.pageId}>
                          <Link
                            href={href}
                            onClick={() => {
                              setOpenSectionSlug(null);
                              setMobileOpen(false);
                            }}
                            className={`block px-4 py-2.5 text-sm font-semibold transition ${
                              isActive
                                ? "bg-emerald-50 text-emerald-900"
                                : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
                            } ${lang === "hi" ? "font-hindi" : ""}`}
                          >
                            {formatMenuLabel(
                              t(subsection.titleEn, subsection.titleHi ?? subsection.titleEn),
                              lang,
                              "title",
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            }

            return (
              <li key={section.pageId} className="relative flex items-center">
                {index > 0 && <span className="ccshau-main-nav-separator" aria-hidden />}
                <Link
                  href={getCollegeSectionPath(college.collegeSlug, section.slug)}
                  className={collegeNavLinkClass(isSectionActive, false, lang)}
                  onClick={() => setMobileOpen(false)}
                >
                  {t(section.titleEn, section.titleHi ?? section.titleEn)}
                </Link>
              </li>
            );
          })}
        </ul>

        {mobileOpen && (
          <div className="border-t border-amber-400/20 lg:hidden">
            <ul>
              {links.map((link) => {
                if (link.type === "home") {
                  const isActive = isHomePage && !facultyTab;
                  return (
                    <li key="home-mobile">
                      <Link
                        href={homePath}
                        onClick={() => setMobileOpen(false)}
                        className={`flex w-full border-b border-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-amber-200 ${isActive ? "bg-white/10 text-amber-200" : ""} ${lang === "hi" ? "font-hindi" : ""}`}
                      >
                        {t(link.labelEn, link.labelHi)}
                      </Link>
                    </li>
                  );
                }

                if (link.type === "contact") {
                  return (
                    <li key="contact-mobile">
                      <Link
                        href={getCollegeContactPath(college.collegeSlug)}
                        onClick={() => setMobileOpen(false)}
                        className={`flex w-full border-b border-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-amber-200 ${isContactPage ? "bg-white/10 text-amber-200" : ""} ${lang === "hi" ? "font-hindi" : ""}`}
                      >
                        {t(link.labelEn, link.labelHi)}
                      </Link>
                    </li>
                  );
                }

                if (link.type === "external" || link.type === "faculty") {
                  return (
                    <li key={`${link.labelEn}-mobile`}>
                      <Link
                        href={link.href}
                        target={link.type === "external" ? "_blank" : undefined}
                        rel={link.type === "external" ? "noopener noreferrer" : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={`flex w-full border-b border-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-amber-200 ${lang === "hi" ? "font-hindi" : ""}`}
                      >
                        {t(link.labelEn, link.labelHi)}
                      </Link>
                    </li>
                  );
                }

                const { section } = link;
                const isSectionActive = activeSectionSlug === section.slug;

                return (
                  <li key={`${section.pageId}-mobile`}>
                    <Link
                      href={getCollegeSectionPath(college.collegeSlug, section.slug)}
                      onClick={() => setMobileOpen(false)}
                      className={`flex w-full border-b border-white/5 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-amber-200 ${isSectionActive ? "bg-white/10 text-amber-200" : ""} ${lang === "hi" ? "font-hindi" : ""}`}
                    >
                      {t(section.titleEn, section.titleHi ?? section.titleEn)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>
    </div>
  );
}
