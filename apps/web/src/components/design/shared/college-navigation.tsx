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

  const topLinkClass = (active: boolean) =>
    `flex w-full items-center justify-between gap-1 rounded-lg px-4 py-3 text-sm font-bold uppercase tracking-wide transition lg:w-auto lg:justify-start ${
      active ? "bg-[#0b3d2e] text-amber-200 shadow-inner" : "text-white hover:bg-white/15"
    } ${lang === "hi" ? "font-hindi normal-case" : ""}`;

  return (
    <div className="border-t border-white/15 bg-gradient-to-r from-[#5a8530] via-[#6b9b37] to-[#84bd47] shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-1 lg:py-0">
        <p className="hidden text-xs font-medium text-white/90 lg:block">
          {t(college.titleEn, college.titleHi ?? college.titleEn)}
        </p>
        <button
          type="button"
          className="my-2 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white lg:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
        >
          {t("College Menu", "महाविद्यालय मेनू")}
          <ChevronDown className={`h-4 w-4 transition ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      <nav
        aria-label="College navigation"
        className={`${mobileOpen ? "block" : "hidden"} border-t border-white/10 lg:block`}
      >
        <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-center">
          {links.map((link) => {
            if (link.type === "home") {
              const isActive = activeSectionSlug == null;
              return (
                <li key="home" className="lg:relative">
                  <Link
                    href={`/college/${college.collegeSlug}`}
                    className={topLinkClass(isActive)}
                    onClick={() => setMobileOpen(false)}
                  >
                    {t(link.labelEn, link.labelHi)}
                  </Link>
                </li>
              );
            }

            if (link.type === "contact") {
              return (
                <li key="contact">
                  <Link
                    href="/contact"
                    className={topLinkClass(false)}
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
                  className="lg:relative"
                  onMouseEnter={() => setOpenSectionSlug(section.slug)}
                  onMouseLeave={() => setOpenSectionSlug(null)}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() => setOpenSectionSlug(isOpen ? null : section.slug)}
                    className={topLinkClass(isSectionActive)}
                  >
                    <span>{t(section.titleEn, section.titleHi ?? section.titleEn)}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
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
              <li key={section.slug}>
                <Link
                  href={getCollegeSectionPath(college.collegeSlug, section.slug)}
                  className={topLinkClass(isSectionActive)}
                  onClick={() => setMobileOpen(false)}
                >
                  {t(section.titleEn, section.titleHi ?? section.titleEn)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
