"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { useLanguage } from "@/components/design/shared/language-context";
import { getCollegeSectionPath, getCollegeSubsectionPath } from "@/lib/pages/routes";
import type { PublicCollegePage } from "@/lib/data/public-types";

function parseCollegeNavState(pathname: string, collegeSlug: string) {
  const base = `/college/${collegeSlug}`;
  if (pathname === base) {
    return { activeSectionSlug: null as string | null, activeSubsectionSlug: null as string | null };
  }

  if (!pathname.startsWith(`${base}/`)) {
    return { activeSectionSlug: null, activeSubsectionSlug: null };
  }

  const parts = pathname.slice(base.length + 1).split("/").filter(Boolean);
  return {
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
  const { activeSectionSlug, activeSubsectionSlug } = parseCollegeNavState(
    pathname,
    college.collegeSlug,
  );
  const [openSectionSlug, setOpenSectionSlug] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { type: "home" as const, labelEn: "Home", labelHi: "होम" },
    ...college.sections.map((section) => ({ type: "section" as const, section })),
    { type: "contact" as const, labelEn: "Contact Us", labelHi: "संपर्क करें" },
  ];

  return (
    <div className="ccshau-main-nav-bar">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2 lg:hidden">
        <p className="text-xs font-medium text-emerald-100/90">
          {t(college.titleEn, college.titleHi ?? college.titleEn)}
        </p>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
        >
          {t("College Menu", "महाविद्यालय मेनू")}
          <ChevronDown className={`h-4 w-4 transition ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      <nav
        aria-label="College navigation"
        className={`relative ${mobileOpen ? "block" : "hidden"} lg:block`}
      >
        <ul className="ccshau-main-nav-list mx-auto hidden max-w-7xl items-center justify-center gap-0 px-4 lg:flex">
          {links.map((link, index) => {
            if (link.type === "home") {
              const isActive = activeSectionSlug == null;
              return (
                <li key="home" className="relative flex items-center">
                  {index > 0 && <span className="ccshau-main-nav-separator" aria-hidden />}
                  <Link
                    href={`/college/${college.collegeSlug}`}
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
                    href="/contact"
                    className={collegeNavLinkClass(false, false, lang)}
                    onClick={() => setMobileOpen(false)}
                  >
                    {t(link.labelEn, link.labelHi)}
                  </Link>
                </li>
              );
            }

            const { section } = link;
            const hasSubsections = section.subsections.length > 0;
            const isSectionActive = activeSectionSlug === section.slug;
            const isOpen = openSectionSlug === section.slug;

            if (hasSubsections) {
              return (
                <li
                  key={section.slug}
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
                    <ChevronDown className={`h-4 w-4 shrink-0 opacity-70 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <ul
                    className={`overflow-hidden rounded-lg border border-emerald-200 bg-white py-1 shadow-xl transition ${
                      isOpen ? "mt-1 block" : "hidden"
                    } ml-3 lg:absolute lg:left-0 lg:top-full lg:z-50 lg:ml-0 lg:mt-0 lg:block lg:min-w-[260px] lg:pt-1 ${
                      isOpen ? "lg:visible lg:opacity-100" : "lg:invisible lg:opacity-0"
                    }`}
                  >
                    {section.subsections.map((subsection) => {
                      const href = getCollegeSubsectionPath(
                        college.collegeSlug,
                        section.slug,
                        subsection.slug,
                      );
                      const isActive = activeSubsectionSlug === subsection.slug;

                      return (
                        <li key={subsection.slug}>
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
                            {t(subsection.titleEn, subsection.titleHi ?? subsection.titleEn)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            }

            return (
              <li key={section.slug} className="relative flex items-center">
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
                  const isActive = activeSectionSlug == null;
                  return (
                    <li key="home-mobile">
                      <Link
                        href={`/college/${college.collegeSlug}`}
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
                        href="/contact"
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
                  <li key={`${section.slug}-mobile`}>
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
